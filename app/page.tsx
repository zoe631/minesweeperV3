"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  RotateCcw,
  Lightbulb,
  Zap,
  ZoomIn,
  ZoomOut,
  Shield,
  User,
  LogOut,
  UserCircle,
  Trophy,
  Settings,
  Clock,
} from "lucide-react"
import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AuthModal } from "@/components/auth-modal"
import { ProfileModal } from "@/components/profile-modal"
import { LeaderboardModal } from "@/components/leaderboard-modal"
import { SettingsModal } from "@/components/settings-modal"
import { NotificationsButton } from "@/components/notifications-button"
import { Switch } from "@/components/ui/switch"
import { auth, db } from "@/lib/firebase"
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth"
import { doc, updateDoc, increment, getDoc } from "firebase/firestore"
import { GameResultModal } from "@/components/game-result-modal"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FeedbackButton } from "@/components/feedback-button"

interface Cell {
  isMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  neighborMines: number
}

interface GameSettings {
  width: number
  height: number
  totalMines: number
  chunkMines: number
}

interface GameState {
  board: Cell[][]
  gameStatus: "playing" | "won" | "lost"
  settings: GameSettings
}

// Standard difficulty presets
const STANDARD_PRESETS = [
  { name: "Easy", width: 9, height: 9, totalMines: 10, hints: 3 },
  { name: "Medium", width: 16, height: 16, totalMines: 40, hints: 6 },
  { name: "Hard", width: 30, height: 16, totalMines: 99, hints: 8 },
  { name: "Expert", width: 24, height: 24, totalMines: 150, hints: 5 },
]

// Version management - safe for SSR
const getCurrentVersion = () => {
  if (typeof window === "undefined") return "0.0.3.4" // Default for SSR
  const stored = localStorage.getItem("minesweeper_version")
  return stored || "0.0.3.4"
}

const incrementVersion = () => {
  if (typeof window === "undefined") return "0.0.3.4" // Default for SSR

  const current = getCurrentVersion()
  const parts = current.split(".").map(Number)

  // Increment the last digit
  parts[3]++

  // Handle rollover logic
  if (parts[3] >= 100) {
    parts[3] = 0
    parts[2]++

    if (parts[2] >= 100) {
      parts[2] = 0
      parts[1]++
    }
  }

  const newVersion = parts.join(".")
  localStorage.setItem("minesweeper_version", newVersion)
  return newVersion
}

export default function Minesweeper() {
  // All existing state and functions remain the same...
  const [isDark, setIsDark] = useState(true)
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [gameState, setGameState] = useState<GameState>({
    board: [],
    gameStatus: "playing",
    settings: {
      width: 16,
      height: 16,
      totalMines: 40,
      chunkMines: 8,
    },
  })
  const [tempSettings, setTempSettings] = useState<GameSettings>({
    width: 16,
    height: 16,
    totalMines: 40,
    chunkMines: 8,
  })
  const [firstClick, setFirstClick] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [safeStart, setSafeStart] = useState(true)
  const [gameStartTime, setGameStartTime] = useState<number | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [hintsRemaining, setHintsRemaining] = useState(6) // Default for Medium
  const [handleWheel, setHandleWheel] = useState<((e: WheelEvent) => void) | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const [showGameResultModal, setShowGameResultModal] = useState(false)
  const [gameResult, setGameResult] = useState<{
    won: boolean
    rewards: { coins: number; experience: number }
    statistics: { winRateChange: number; cellsOpened: number; minesDefused: number; gamesPlayedChange: number }
  } | null>(null)
  const [previousStats, setPreviousStats] = useState<{
    gamesPlayed: number
    gamesWon: number
  } | null>(null)
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceReason, setMaintenanceReason] = useState("")
  const [userRole, setUserRole] = useState<string>("")
  const [currentVersion, setCurrentVersion] = useState("0.0.3.4") // Default version
  const [isClient, setIsClient] = useState(false)
  const [accessRestriction, setAccessRestriction] = useState<string>("none")

  // Handle client-side mounting and version increment
  useEffect(() => {
    setIsClient(true)
    // Only get current version on client side
    const version = getCurrentVersion()
    setCurrentVersion(version)
  }, [])

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        try {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            setUserRole(userData.role || "user")
          }
        } catch (error) {
          console.error("Error fetching user role:", error)
        }
      } else {
        setUserRole("")
      }
    })

    return () => unsubscribe()
  }, [])

  // Timer effect
  useEffect(() => {
    if (gameStartTime && gameState.gameStatus === "playing") {
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - gameStartTime) / 1000))
      }, 1000)
    } else if (gameState.gameStatus !== "playing" && timerRef.current) {
      clearInterval(timerRef.current)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameStartTime, gameState.gameStatus])

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Check if current settings are standard
  const isStandardPreset = useCallback((settings: GameSettings) => {
    return STANDARD_PRESETS.some(
      (preset) =>
        preset.width === settings.width &&
        preset.height === settings.height &&
        preset.totalMines === settings.totalMines,
    )
  }, [])

  // Get preset for current settings
  const getCurrentPreset = useCallback((settings: GameSettings) => {
    return STANDARD_PRESETS.find(
      (preset) =>
        preset.width === settings.width &&
        preset.height === settings.height &&
        preset.totalMines === settings.totalMines,
    )
  }, [])

  // Count revealed cells from a starting position
  const countRevealedCells = useCallback((board: Cell[][], startX: number, startY: number) => {
    const visited = new Set<string>()
    const queue = [[startX, startY]]
    let count = 0

    while (queue.length > 0) {
      const [x, y] = queue.shift()!
      const key = `${x},${y}`
      if (visited.has(key)) continue
      visited.add(key)
      count++

      if (board[y][x].neighborMines === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && nx < board[0].length && ny >= 0 && ny < board.length) {
              if (!board[ny][nx].isMine && !visited.has(`${nx},${ny}`)) {
                queue.push([nx, ny])
              }
            }
          }
        }
      }
    }

    return count
  }, [])

  // Initialize game
  const initializeGame = useCallback(
    (settings: GameSettings, avoidX?: number, avoidY?: number, ensureMinCells?: number) => {
      let board: Cell[][]
      let attempts = 0
      const maxAttempts = 100

      do {
        board = Array(settings.height)
          .fill(null)
          .map(() =>
            Array(settings.width)
              .fill(null)
              .map(() => ({
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                neighborMines: 0,
              })),
          )

        // Place mines
        let minesPlaced = 0
        while (minesPlaced < settings.totalMines) {
          const x = Math.floor(Math.random() * settings.width)
          const y = Math.floor(Math.random() * settings.height)

          if (!board[y][x].isMine && !(avoidX === x && avoidY === y)) {
            board[y][x].isMine = true
            minesPlaced++
          }
        }

        // Calculate neighbor mines
        for (let y = 0; y < settings.height; y++) {
          for (let x = 0; x < settings.width; x++) {
            if (!board[y][x].isMine) {
              let count = 0
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const ny = y + dy
                  const nx = x + dx
                  if (ny >= 0 && ny < settings.height && nx >= 0 && nx < settings.width) {
                    if (board[ny][nx].isMine) count++
                  }
                }
              }
              board[y][x].neighborMines = count
            }
          }
        }

        attempts++
      } while (
        ensureMinCells &&
        avoidX !== undefined &&
        avoidY !== undefined &&
        countRevealedCells(board, avoidX, avoidY) < ensureMinCells &&
        attempts < maxAttempts
      )

      return board
    },
    [countRevealedCells],
  )

  const resetGame = useCallback(() => {
    // Reset timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setElapsedTime(0)
    setGameStartTime(null)

    // Reset hints based on difficulty
    const preset = getCurrentPreset(gameState.settings)
    setHintsRemaining(preset?.hints || 0)

    setGameState((prev) => ({
      ...prev,
      board: initializeGame(prev.settings),
      gameStatus: "playing",
    }))
    setFirstClick(true)
  }, [initializeGame, gameState.settings, getCurrentPreset])

  const applySettings = useCallback(() => {
    // Reset timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setElapsedTime(0)
    setGameStartTime(null)

    // Reset hints based on new difficulty
    const preset = getCurrentPreset(tempSettings)
    setHintsRemaining(preset?.hints || 0)

    setGameState((prev) => ({
      ...prev,
      settings: { ...tempSettings },
      board: initializeGame(tempSettings),
      gameStatus: "playing",
    }))
    setFirstClick(true)
  }, [tempSettings, initializeGame, getCurrentPreset])

  const updateUserStats = useCallback(
    async (won: boolean, gameTime?: number) => {
      if (!user) return

      // Only track stats for standard presets
      if (!isStandardPreset(gameState.settings)) {
        console.log("Custom settings detected - stats not tracked")
        return
      }

      try {
        const userRef = doc(db, "users", user.uid)

        // Get current stats for comparison
        const userDoc = await getDoc(userRef)
        const currentData = userDoc.data()
        const currentGamesPlayed = currentData?.gamesPlayed || 0
        const currentGamesWon = currentData?.gamesWon || 0

        // Count revealed cells
        const revealedCells = gameState.board.flat().filter((cell) => cell.isRevealed).length

        // Count flagged mines (correctly identified mines)
        const flaggedMines = gameState.board.flat().filter((cell) => cell.isFlagged && cell.isMine).length

        // Calculate mines defused - either flagged mines or total mines if won
        const minesDefusedThisGame = won ? gameState.settings.totalMines : flaggedMines

        // Calculate rewards based on mines defused
        const experienceReward = minesDefusedThisGame
        const coinReward = won ? minesDefusedThisGame * 2 : 0 // Double coins for winning

        const updateData: any = {
          gamesPlayed: increment(1),
          experience: increment(experienceReward),
          cellsOpened: increment(revealedCells),
        }

        if (won) {
          updateData.gamesWon = increment(1)
          updateData.minesDefused = increment(minesDefusedThisGame)
          updateData.coins = increment(coinReward)
          if (gameTime) {
            updateData.totalTime = increment(gameTime)
            updateData.bestTime = gameTime
          }
        } else {
          // Even if lost, count the correctly flagged mines
          updateData.minesDefused = increment(flaggedMines)
        }

        await updateDoc(userRef, updateData)

        // Calculate statistics changes
        const newGamesPlayed = currentGamesPlayed + 1
        const newGamesWon = currentGamesWon + (won ? 1 : 0)

        const oldWinRate = currentGamesPlayed > 0 ? (currentGamesWon / currentGamesPlayed) * 100 : 0
        const newWinRate = (newGamesWon / newGamesPlayed) * 100
        const winRateChange = newWinRate - oldWinRate

        // Show game result modal
        setGameResult({
          won,
          rewards: {
            coins: coinReward,
            experience: experienceReward,
          },
          statistics: {
            winRateChange,
            cellsOpened: revealedCells,
            minesDefused: minesDefusedThisGame,
            gamesPlayedChange: 1,
          },
        })
        setShowGameResultModal(true)
      } catch (error) {
        console.error("Error updating user stats:", error)
      }
    },
    [user, gameState.settings, gameState.board, isStandardPreset],
  )

  const revealCell = useCallback(
    (x: number, y: number) => {
      setGameState((prev) => {
        if (prev.gameStatus !== "playing") return prev

        let newBoard = prev.board.map((row) => [...row])

        // First click - ensure it's not a mine and optionally ensure safe start
        if (firstClick) {
          if (safeStart) {
            newBoard = initializeGame(prev.settings, x, y, 13)
          } else {
            newBoard = initializeGame(prev.settings, x, y)
          }
          setFirstClick(false)
          setGameStartTime(Date.now())
        }

        if (newBoard[y][x].isRevealed || newBoard[y][x].isFlagged) return prev

        newBoard[y][x].isRevealed = true

        if (newBoard[y][x].isMine) {
          // Game lost
          const gameTime = gameStartTime ? Date.now() - gameStartTime : 0
          updateUserStats(false, gameTime)
          return { ...prev, board: newBoard, gameStatus: "lost" }
        } else if (newBoard[y][x].neighborMines === 0) {
          // Reveal empty cells recursively
          const queue = [[x, y]]
          const visited = new Set<string>()

          while (queue.length > 0) {
            const [cx, cy] = queue.shift()!
            const key = `${cx},${cy}`
            if (visited.has(key)) continue
            visited.add(key)

            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                const nx = cx + dx
                const ny = cy + dy
                if (nx >= 0 && nx < prev.settings.width && ny >= 0 && ny < prev.settings.height) {
                  if (!newBoard[ny][nx].isRevealed && !newBoard[ny][nx].isFlagged && !newBoard[ny][nx].isMine) {
                    newBoard[ny][nx].isRevealed = true
                    if (newBoard[ny][nx].neighborMines === 0) {
                      queue.push([nx, ny])
                    }
                  }
                }
              }
            }
          }
        }

        return {
          ...prev,
          board: newBoard,
          gameStatus: "playing",
        }
      })
    },
    [firstClick, initializeGame, safeStart, gameStartTime, updateUserStats],
  )

  const toggleFlag = useCallback(
    (x: number, y: number, e: React.MouseEvent) => {
      e.preventDefault()
      setGameState((prev) => {
        if (prev.gameStatus !== "playing" || prev.board[y][x].isRevealed) return prev

        const newBoard = prev.board.map((row) => [...row])
        newBoard[y][x].isFlagged = !newBoard[y][x].isFlagged

        // Check win condition: all mines are flagged and no extra flags
        const flaggedCells = newBoard.flat().filter((cell) => cell.isFlagged)
        const mineCells = newBoard.flat().filter((cell) => cell.isMine)

        let gameStatus = prev.gameStatus
        if (flaggedCells.length === mineCells.length && flaggedCells.length === prev.settings.totalMines) {
          // Check if all flagged cells are mines
          const allFlagsOnMines = flaggedCells.every((cell) => cell.isMine)
          if (allFlagsOnMines) {
            gameStatus = "won"
            // Game won
            const gameTime = gameStartTime ? Date.now() - gameStartTime : 0
            updateUserStats(true, gameTime)
          }
        }

        return { ...prev, board: newBoard, gameStatus }
      })
    },
    [gameStartTime, updateUserStats],
  )

  const countAdjacentFlags = useCallback(
    (x: number, y: number) => {
      let count = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < gameState.settings.width && ny >= 0 && ny < gameState.settings.height) {
            if (gameState.board[ny][nx].isFlagged) count++
          }
        }
      }
      return count
    },
    [gameState.board, gameState.settings],
  )

  const revealAdjacentCells = useCallback(
    (x: number, y: number) => {
      const cell = gameState.board[y][x]
      if (!cell.isRevealed || cell.neighborMines === 0) return

      const flagCount = countAdjacentFlags(x, y)
      if (flagCount !== cell.neighborMines) return

      // Reveal all adjacent non-flagged cells
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < gameState.settings.width && ny >= 0 && ny < gameState.settings.height) {
            const adjacentCell = gameState.board[ny][nx]
            if (!adjacentCell.isRevealed && !adjacentCell.isFlagged) {
              revealCell(nx, ny)
            }
          }
        }
      }
    },
    [gameState.board, gameState.settings, countAdjacentFlags, revealCell],
  )

  const useHint = useCallback(() => {
    // Check if hints are available
    if (hintsRemaining <= 0) return

    // Find a safe cell to reveal
    const safeCells: [number, number][] = []
    for (let y = 0; y < gameState.settings.height; y++) {
      for (let x = 0; x < gameState.settings.width; x++) {
        if (!gameState.board[y][x].isRevealed && !gameState.board[y][x].isMine && !gameState.board[y][x].isFlagged) {
          safeCells.push([x, y])
        }
      }
    }

    if (safeCells.length > 0) {
      const [x, y] = safeCells[Math.floor(Math.random() * safeCells.length)]
      revealCell(x, y)
      setHintsRemaining((prev) => prev - 1)
    }
  }, [gameState, revealCell, hintsRemaining])

  const panicSave = useCallback(() => {
    // Only save if we're on the client side
    if (typeof window === "undefined") return

    // Save game state to cookies
    const gameData = {
      gameState,
      timestamp: Date.now(),
      isDark,
      hintsRemaining,
      elapsedTime,
      gameStartTime,
    }
    document.cookie = `minesweeper_panic=${JSON.stringify(gameData)}; max-age=86400; path=/`

    // Redirect to Google
    window.location.href = "https://www.google.com"
  }, [gameState, isDark, hintsRemaining, elapsedTime, gameStartTime])

  const handleSignOut = useCallback(async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }, [])

  const zoomIn = useCallback(() => {
    setZoomLevel((prev) => Math.min(prev + 0.25, 2.5))
  }, [])

  const zoomOut = useCallback(() => {
    setZoomLevel((prev) => Math.max(prev - 0.25, 0.5))
  }, [])

  const resetZoom = useCallback(() => {
    setZoomLevel(1)
  }, [])

  // Calculate remaining flags
  const flagsRemaining = useCallback(() => {
    const flaggedCount = gameState.board.flat().filter((cell) => cell.isFlagged).length
    return gameState.settings.totalMines - flaggedCount
  }, [gameState.board, gameState.settings.totalMines])

  // Load saved game on mount - only on client side
  useEffect(() => {
    if (!isClient) return

    const cookies = document.cookie.split(";")
    const panicCookie = cookies.find((cookie) => cookie.trim().startsWith("minesweeper_panic="))

    if (panicCookie) {
      try {
        const gameData = JSON.parse(panicCookie.split("=")[1])
        setGameState(gameData.gameState)
        setTempSettings(gameData.gameState.settings)
        setIsDark(gameData.isDark)
        setFirstClick(false)
        setHintsRemaining(gameData.hintsRemaining || 0)
        setElapsedTime(gameData.elapsedTime || 0)

        // Restore timer if game was in progress
        if (gameData.gameStartTime && gameData.gameState.gameStatus === "playing") {
          setGameStartTime(gameData.gameStartTime)
        }
      } catch (e) {
        resetGame()
      }
    } else {
      resetGame()
    }
  }, [isClient, resetGame])

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.add("dark")
  }, [])

  // Check maintenance mode and access restrictions
  useEffect(() => {
    const checkSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "maintenance"))
        if (settingsDoc.exists()) {
          const data = settingsDoc.data()
          setMaintenanceMode(data.enabled || false)
          setMaintenanceReason(data.reason || "")
          setAccessRestriction(data.accessRestriction || "none")
        }
      } catch (error) {
        console.error("Error checking settings:", error)
      }
    }

    checkSettings()
  }, [])

  const getCellDisplay = (cell: Cell) => {
    if (cell.isFlagged) return "🚩"
    if (!cell.isRevealed) return ""
    if (cell.isMine) return "💣"
    if (cell.neighborMines === 0) return ""
    return cell.neighborMines.toString()
  }

  const getCellColor = (cell: Cell) => {
    if (!cell.isRevealed || cell.neighborMines === 0) return ""
    const colors = [
      "",
      "text-blue-500 dark:text-blue-400",
      "text-green-500 dark:text-green-400",
      "text-red-500 dark:text-red-400",
      "text-purple-500 dark:text-purple-400",
      "text-yellow-500 dark:text-yellow-400",
      "text-pink-500 dark:text-pink-400",
      "text-gray-600 dark:text-gray-400",
      "text-gray-800 dark:text-gray-200",
    ]
    return colors[cell.neighborMines] || ""
  }

  // Calculate cell size based on board dimensions
  const getCellSize = () => {
    const totalWidth = gameState.settings.width
    const totalHeight = gameState.settings.height
    const maxDimension = Math.max(totalWidth, totalHeight)

    if (maxDimension <= 16) return "w-6 h-6 text-xs"
    if (maxDimension <= 24) return "w-5 h-5 text-xs"
    return "w-4 h-4 text-[0.65rem]"
  }

  useEffect(() => {
    const newHandleWheel = (e: WheelEvent) => {
      const gameBoard = document.querySelector(".overflow-auto")
      if (gameBoard) {
        gameBoard.scrollTop += e.deltaY
        if (e.target && (e.target as HTMLElement).closest(".overflow-auto")) {
          e.preventDefault()
        }
      }
    }

    setHandleWheel(() => newHandleWheel)

    // Добавляем обработчик события wheel с опцией passive: false для предотвращения стандартного поведения
    window.addEventListener("wheel", newHandleWheel, { passive: false })

    return () => {
      window.removeEventListener("wheel", newHandleWheel)
    }
  }, [])

  const currentIsStandard = isStandardPreset(gameState.settings)

  // Check if maintenance mode is active and user is not admin/dev/tester
  if (maintenanceMode && user && userRole !== "admin" && userRole !== "dev" && userRole !== "tester") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Maintenance Mode
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              The game is currently undergoing maintenance and is temporarily unavailable.
            </p>
            {maintenanceReason && (
              <div className="p-3 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-400">Reason:</p>
                <p className="text-white">{maintenanceReason}</p>
              </div>
            )}
            <p className="text-gray-400 text-sm">Please check back later. We apologize for the inconvenience.</p>
            <Button onClick={handleSignOut} className="w-full bg-red-600 hover:bg-red-700 text-white">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if access is restricted and user is not admin/dev/tester
  if (
    accessRestriction === "restricted" &&
    user &&
    userRole !== "admin" &&
    userRole !== "dev" &&
    userRole !== "tester"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 p-6">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              Access to the game is currently restricted. Only authorized personnel can access the system at this time.
            </p>
            <p className="text-gray-400 text-sm">Please contact an administrator if you believe this is an error.</p>
            <Button onClick={handleSignOut} className="w-full bg-orange-600 hover:bg-orange-700 text-white">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Only update the header section in the return statement
  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDark ? "dark bg-gray-900" : "bg-gray-50"} relative`}
    >
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Minesweeper</h1>

          <div className="flex items-center gap-4">
            {/* Game Info */}
            <div className="flex items-center gap-4 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg">
              {/* Timer */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{formatTime(elapsedTime)}</span>
              </div>

              {/* Mines Counter */}
              <div className="flex items-center gap-2">
                <span className="text-sm">💣</span>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{flagsRemaining()}</span>
              </div>

              {/* Hints Counter */}
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{hintsRemaining}</span>
              </div>
            </div>

            {/* Notifications Button */}
            <NotificationsButton />

            {/* Leaderboard Button */}
            <div className="group relative">
              <Button
                variant="outline"
                onClick={() => setShowLeaderboardModal(true)}
                className="px-4 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                Leaderboard
              </Button>
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                View Global Rankings
              </div>
            </div>

            {/* User Info */}
            {user ? (
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  onClick={() => setShowProfileModal(true)}
                >
                  <UserCircle className="h-5 w-5 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {user.displayName || user.email}
                  </span>
                  <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSignOut} title="Sign Out">
                      <LogOut className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={() => setShowAuthModal(true)}
                className="px-4 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <User className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            )}

            {/* Safe Start Toggle */}
            <div className="flex items-center gap-2">
              <Shield className={`h-4 w-4 ${safeStart ? "text-green-500" : "text-gray-400"}`} />
              <Switch checked={safeStart} onCheckedChange={setSafeStart} />
            </div>
          </div>
        </div>

        {/* Custom Settings Warning */}
        {!currentIsStandard && (
          <div className="mb-4 mx-auto max-w-2xl">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Custom Difficulty Active</p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    You're playing with custom settings. Statistics and leaderboard progress won't be tracked. Use
                    standard presets (Easy, Medium, Hard, Expert) to compete!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Controls */}
        <div className="flex justify-center gap-4 mb-6 flex-wrap">
          {/* Restart Button */}
          <div className="group relative">
            <Button
              variant="outline"
              size="icon"
              onClick={resetGame}
              className="rounded-full w-12 h-12 transition-all duration-200 hover:scale-110 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <RotateCcw className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </Button>
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Restart Game
            </div>
          </div>

          {/* Hint Button */}
          <div className="group relative">
            <Button
              variant="outline"
              size="icon"
              onClick={useHint}
              disabled={hintsRemaining <= 0}
              className="rounded-full w-12 h-12 transition-all duration-200 hover:scale-110 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <Lightbulb className={`h-5 w-5 ${hintsRemaining > 0 ? "text-yellow-500" : "text-gray-400"}`} />
            </Button>
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              {hintsRemaining > 0 ? `Use Hint (${hintsRemaining} left)` : "No Hints Left"}
            </div>
          </div>

          {/* Panic Button */}
          <div className="group relative">
            <Button
              variant="outline"
              size="icon"
              onClick={panicSave}
              className="rounded-full w-12 h-12 transition-all duration-200 hover:scale-110 bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 border-red-200 dark:border-red-700"
            >
              <Zap className="h-5 w-5 text-red-600 dark:text-red-400" />
            </Button>
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Panic!
            </div>
          </div>

          {/* Settings Button */}
          <div className="group relative">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowSettingsModal(true)}
              className="rounded-full w-12 h-12 transition-all duration-200 hover:scale-110 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <Settings className="h-5 w-5 text-gray-700 dark:text-gray-200" />
            </Button>
            <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Game Settings
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 ml-2">
            <div className="group relative">
              <Button
                variant="outline"
                size="icon"
                onClick={zoomOut}
                disabled={zoomLevel <= 0.5}
                className="rounded-full w-10 h-10 transition-all duration-200 hover:scale-110 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <ZoomOut className="h-4 w-4 text-gray-700 dark:text-gray-200" />
              </Button>
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Zoom Out
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={resetZoom}
              className="px-2 h-8 text-xs text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {Math.round(zoomLevel * 100)}%
            </Button>

            <div className="group relative">
              <Button
                variant="outline"
                size="icon"
                onClick={zoomIn}
                disabled={zoomLevel >= 2.5}
                className="rounded-full w-10 h-10 transition-all duration-200 hover:scale-110 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <ZoomIn className="h-4 w-4 text-gray-700 dark:text-gray-200" />
              </Button>
              <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Zoom In
              </div>
            </div>
          </div>
        </div>

        {/* Game Board */}
        <div className="w-full flex justify-center">
          <div
            className="overflow-auto border-2 border-gray-200 dark:border-gray-700 rounded-lg relative"
            style={{
              width: "95vw",
              height: "75vh",
              scrollbarWidth: "thin",
              scrollbarColor: "rgb(156 163 175) transparent",
            }}
          >
            {/* Darkening overlay when game is over */}
            {gameState.gameStatus !== "playing" && (
              <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none"></div>
            )}
            <div
              className="flex justify-center items-center min-h-full min-w-full p-16"
              style={{
                minHeight: `${gameState.settings.height * (getCellSize().includes("h-6") ? 24 : getCellSize().includes("h-5") ? 20 : 16) * zoomLevel + 200}px`,
                minWidth: `${gameState.settings.width * (getCellSize().includes("w-6") ? 24 : getCellSize().includes("w-5") ? 20 : 16) * zoomLevel + 200}px`,
              }}
            >
              <div
                className="transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "center",
                }}
              >
                <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                  <div
                    className="grid gap-[2px]"
                    style={{
                      gridTemplateColumns: `repeat(${gameState.settings.width}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${gameState.settings.height}, minmax(0, 1fr))`,
                    }}
                  >
                    {gameState.board.map((row, y) =>
                      row.map((cell, x) => (
                        <button
                          key={`${x}-${y}`}
                          className={`
    ${getCellSize()}
    font-bold border border-gray-300 dark:border-gray-600 
    transition-all duration-150 hover:scale-105
    ${
      cell.isRevealed
        ? cell.isMine
          ? "bg-red-500 text-white"
          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
        : "bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
    }
    ${getCellColor(cell)}
  `}
                          onClick={() => {
                            const cell = gameState.board[y][x]
                            if (cell.isRevealed && cell.neighborMines > 0) {
                              revealAdjacentCells(x, y)
                            } else {
                              revealCell(x, y)
                            }
                          }}
                          onContextMenu={(e) => toggleFlag(x, y, e)}
                          disabled={gameState.gameStatus !== "playing"}
                        >
                          {getCellDisplay(cell)}
                        </button>
                      )),
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Version Counter - only show on client side */}
      {isClient && (
        <div className="fixed bottom-4 right-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
          v{currentVersion}
        </div>
      )}

      {/* Feedback Button */}
      <FeedbackButton userRole={userRole} />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {user && <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} userId={user.uid} />}
      <LeaderboardModal isOpen={showLeaderboardModal} onClose={() => setShowLeaderboardModal(false)} />
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentSettings={gameState.settings}
        tempSettings={tempSettings}
        setTempSettings={setTempSettings}
        onApplySettings={applySettings}
      />
      {gameResult && (
        <GameResultModal
          isOpen={showGameResultModal}
          onClose={() => setShowGameResultModal(false)}
          gameWon={gameResult.won}
          rewards={gameResult.rewards}
          statistics={gameResult.statistics}
        />
      )}
    </div>
  )
}
