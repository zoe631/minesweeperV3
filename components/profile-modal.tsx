"use client"

import { useState, useEffect } from "react"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { updateProfile } from "firebase/auth"
import { db, auth } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import {
  X,
  Trophy,
  Clock,
  Calendar,
  Edit2,
  Save,
  UserIcon,
  Bomb,
  Target,
  Coins,
  Settings,
  Star,
  Gamepad,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { collection, getDocs, query, where } from "firebase/firestore"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
}

interface UserStats {
  userId: number
  username: string
  email: string
  role: string
  customRole?: string
  customRoleColor?: string
  createdAt: Date
  gamesPlayed: number
  gamesWon: number
  totalTime: number
  bestTime: number | null
  minesDefused: number
  coins: number
  experience: number
  photoURL?: string
  cellsOpened?: number
  achievements?: Array<{
    name: string
    rarity?: string
    description?: string
    image?: string
  }>;
}

const getRoleColor = (role: string) => {
  switch (role) {
    case "admin":
      return "text-orange-500"
    case "dev":
      return "text-red-500"
    case "tester":
      return "text-purple-500"
    default:
      return "text-blue-500"
  }
}

const getRoleBgColor = (role: string) => {
  switch (role) {
    case "admin":
      return "bg-orange-500/10"
    case "dev":
      return "bg-red-500/10"
    case "tester":
      return "bg-purple-500/10"
    default:
      return "bg-blue-500/10"
  }
}

const getRoleBorderColor = (role: string) => {
  switch (role) {
    case "admin":
      return "border-orange-500"
    case "dev":
      return "border-red-500"
    case "tester":
      return "border-purple-500"
    default:
      return "border-blue-500"
  }
}

const getRoleName = (role: string) => {
  switch (role) {
    case "admin":
      return "Administrator"
    case "dev":
      return "Developer"
    case "tester":
      return "Tester"
    default:
      return "User"
  }
}

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split("@")
  if (localPart.length <= 5) return email // Don't mask very short emails

  const firstTwo = localPart.substring(0, 2)
  const lastThree = localPart.substring(localPart.length - 3)
  const maskedPart = "*".repeat(Math.max(0, localPart.length - 5))

  return `${firstTwo}${maskedPart}${lastThree}@${domain}`
}

const calculateLevel = (experience: number) => {
  // Formula: level = floor(sqrt(experience / 100))
  // Experience needed for level n: (n^2) * 100
  const level = Math.floor(Math.sqrt(experience / 100)) + 1
  const currentLevelExp = Math.pow(level - 1, 2) * 100
  const nextLevelExp = Math.pow(level, 2) * 100
  const expToNext = nextLevelExp - experience

  return {
    level,
    currentExp: experience,
    expToNext,
    currentLevelExp,
    nextLevelExp,
    progress: ((experience - currentLevelExp) / (nextLevelExp - currentLevelExp)) * 100,
  }
}

const getLevelStyle = (level: number) => {
  // Steam-like level styling
  if (level >= 100) {
    return {
      background: "linear-gradient(45deg, #ff6b6b, #ffd93d, #6bcf7f, #4ecdc4, #45b7d1, #96ceb4, #ffeaa7)",
      border: "3px solid transparent",
      backgroundClip: "padding-box",
      animation: "rainbow 3s linear infinite",
    }
  } else if (level >= 50) {
    return {
      background: "linear-gradient(45deg, #667eea, #764ba2)",
      border: "2px solid #667eea",
    }
  } else if (level >= 25) {
    return {
      background: "linear-gradient(45deg, #f093fb, #f5576c)",
      border: "2px solid #f093fb",
    }
  } else if (level >= 10) {
    return {
      background: "linear-gradient(45deg, #4facfe, #00f2fe)",
      border: "2px solid #4facfe",
    }
  } else if (level >= 5) {
    return {
      background: "linear-gradient(45deg, #43e97b, #38f9d7)",
      border: "2px solid #43e97b",
    }
  } else {
    return {
      background: "linear-gradient(45deg, #fa709a, #fee140)",
      border: "2px solid #fa709a",
    }
  }
}

export function ProfileModal({ isOpen, onClose, userId, readOnly = false }: ProfileModalProps & { readOnly?: boolean }) {
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  const [userAchievements, setUserAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editMode, setEditMode] = useState(false)
  const [username, setUsername] = useState("")
  const [activeTab, setActiveTab] = useState("stats")

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId) return
      setLoading(true)
      try {
        const userDoc = await getDoc(doc(db, "users", userId))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUserStats({
            userId: userData.userId || 0,
            username: userData.username || "Player",
            email: userData.email || "",
            role: userData.role || "user",
            customRole: userData.customRole || null,
            customRoleColor: userData.customRoleColor || null,
            createdAt: userData.createdAt?.toDate() || new Date(),
            gamesPlayed: userData.gamesPlayed || 0,
            gamesWon: userData.gamesWon || 0,
            totalTime: userData.totalTime || 0,
            bestTime: userData.bestTime || null,
            minesDefused: userData.minesDefused || 0,
            coins: userData.coins || 0,
            experience: userData.experience || 0,
            photoURL: userData.photoURL || null,
            cellsOpened: userData.cellsOpened || 0,
            achievements: userData.achievements || [],
          })
          setUsername(userData.username || "Player")

          // --- NEW: Load achievements from rewards collection ---
          const achievementIds = userData.achievements || []
          if (achievementIds.length > 0) {
            // Firestore: where('__name__', 'in', [...ids])
            const rewardsRef = collection(db, "rewards")
            // Firestore ограничение: максимум 10 id за раз
            const batches = []
            for (let i = 0; i < achievementIds.length; i += 10) {
              batches.push(achievementIds.slice(i, i + 10))
            }
            let rewards: any[] = []
            for (const batch of batches) {
              const q = query(rewardsRef, where("__name__", "in", batch))
              const snap = await getDocs(q)
              rewards = rewards.concat(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })))
            }
            setUserAchievements(rewards)
          } else {
            setUserAchievements([])
          }
          // --- END NEW ---
        } else {
          setError("User data not found")
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
        setError("Failed to load user data")
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchUserData()
    }
  }, [isOpen, userId])

  const handleSaveUsername = async () => {
    if (!username.trim() || !auth.currentUser) return

    try {
      // Update Firestore
      await updateDoc(doc(db, "users", userId), {
        username: username,
      })

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: username,
      })

      // Update local state
      setUserStats((prev) => (prev ? { ...prev, username } : null))
      setEditMode(false)
    } catch (err) {
      console.error("Error updating username:", err)
      setError("Failed to update username")
    }
  }

  if (!isOpen) return null

  const levelInfo = userStats ? calculateLevel(userStats.experience) : null
  const levelStyle = levelInfo ? getLevelStyle(levelInfo.level) : {}

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 overflow-hidden">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-gray-800 dark:text-white">Player Profile</CardTitle>
            <div className="flex items-center gap-2">
              {/* Admin Panel Access */}
              {userStats && (userStats.role === "admin" || userStats.role === "dev") && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => window.open("/admin", "_blank")}
                  className="text-orange-500 hover:bg-orange-500/10 hover:text-orange-600"
                  title="Admin Panel"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 dark:border-white"></div>
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-8">{error}</div>
          ) : userStats ? (
            <div>
              {/* Profile Header */}
              <div className="relative">
                {/* Banner */}
                <div className="h-32 bg-gradient-to-r from-blue-600 to-purple-600"></div>

                {/* Avatar and Basic Info */}
                <div className="px-6 pb-4 relative">
                  <div className="absolute -top-12 left-6 h-24 w-24 rounded-full bg-white dark:bg-gray-800 p-1 shadow-lg">
                    <div className="h-full w-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {userStats.photoURL ? (
                        <img
                          src={userStats.photoURL || "/placeholder.svg"}
                          alt={userStats.username}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-10 w-10 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="ml-32 pt-2 flex justify-between items-start">
                    <div>
                      {editMode ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="max-w-xs"
                            placeholder="Enter username"
                          />
                          {/* Кнопки редактирования скрывать если readOnly */}
                          {(!readOnly && editMode) && (
                            <Button size="sm" onClick={handleSaveUsername}>
                              <Save className="h-4 w-4 mr-1" /> Save
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-bold text-gray-800 dark:text-white">{userStats.username}</h3>
                          {/* Кнопки редактирования скрывать если readOnly */}
                          {(!readOnly && !editMode) && (
                            <Button size="icon" variant="ghost" onClick={() => setEditMode(true)} className="h-7 w-7">
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">{maskEmail(userStats.email)}</p>

                      {/* User ID and Member Since */}
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <span className="font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                            #{userStats.userId}
                          </span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Member for {formatDistanceToNow(userStats.createdAt, { addSuffix: false })}</span>
                        </span>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div>
                      {userStats.customRole ? (
                        <div className="group relative">
                          <div
                            className="px-3 py-1.5 rounded-full text-sm font-medium border-2"
                            style={{
                              color: userStats.customRoleColor || "#6b7280",
                              borderColor: userStats.customRoleColor || "#6b7280",
                              backgroundColor: `${userStats.customRoleColor || "#6b7280"}15`,
                            }}
                          >
                            {userStats.customRole}
                          </div>
                          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            Real role: {getRoleName(userStats.role)}
                          </div>
                        </div>
                      ) : (
                        <div
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border-2 
                            ${getRoleColor(userStats.role)} ${getRoleBgColor(userStats.role)} ${getRoleBorderColor(userStats.role)}`}
                        >
                          {getRoleName(userStats.role)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Level and Progress Bar */}
                {levelInfo && (
                  <div className="px-6 pb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg"
                        style={levelStyle}
                      >
                        {levelInfo.level}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Level {levelInfo.level}</span>
                          <span className="text-gray-500 dark:text-gray-400">
                            {levelInfo.currentExp} / {levelInfo.nextLevelExp} XP
                          </span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${levelInfo.progress}%`,
                              background: (levelStyle as any).background || undefined,
                            }}
                          ></div>
                        </div>
                        <div className="text-xs text-right mt-1 text-gray-500 dark:text-gray-400">
                          {levelInfo.expToNext} XP to next level
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation Tabs */}
                <div className="border-t border-b border-gray-200 dark:border-gray-700">
                  <div className="flex">
                    <button
                      className={`flex-1 py-3 text-sm font-medium ${
                        activeTab === "stats"
                          ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                      onClick={() => setActiveTab("stats")}
                    >
                      Statistics
                    </button>
                    <button
                      className={`flex-1 py-3 text-sm font-medium ${
                        activeTab === "inventory"
                          ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                      onClick={() => setActiveTab("inventory")}
                    >
                      Inventory
                    </button>
                    <button
                      className={`flex-1 py-3 text-sm font-medium ${
                        activeTab === "achievements"
                          ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                      onClick={() => setActiveTab("achievements")}
                    >
                      Achievements
                    </button>
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {activeTab === "stats" && (
                    <div className="space-y-6">
                      {/* Currency Cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
                          <div className="flex items-center space-x-2">
                            <Coins className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Coins</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-yellow-800 dark:text-yellow-200">
                            {userStats.coins}G
                          </p>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                          <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Experience</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-purple-800 dark:text-purple-200">
                            {userStats.experience} XP
                          </p>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                            <Gamepad className="h-5 w-5 text-purple-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Games</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-white">
                            {userStats.gamesPlayed}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Games played</p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                            <Trophy className="h-5 w-5 text-yellow-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Games Won</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-white">
                            {userStats.gamesWon} / {userStats.gamesPlayed}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {userStats.gamesPlayed > 0
                              ? `${Math.round((userStats.gamesWon / userStats.gamesPlayed) * 100)}% win rate`
                              : "No games played"}
                          </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-blue-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Best Time</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-white">
                            {userStats.bestTime ? `${Math.floor(userStats.bestTime / 1000)}s` : "N/A"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {userStats.totalTime > 0
                              ? `${Math.floor(userStats.totalTime / 60000)} minutes played`
                              : "No time recorded"}
                          </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                            <Bomb className="h-5 w-5 text-red-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mines Defused</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-white">
                            {userStats.minesDefused}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {userStats.gamesWon > 0
                              ? `${Math.round(userStats.minesDefused / userStats.gamesWon)} avg per win`
                              : "No mines defused"}
                          </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center space-x-2">
                            <Target className="h-5 w-5 text-green-500" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cells Opened</span>
                          </div>
                          <p className="text-2xl font-bold mt-1 text-gray-800 dark:text-white">
                            {userStats.cellsOpened || 0}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {userStats.gamesPlayed > 0
                              ? `${Math.round((userStats.cellsOpened || 0) / userStats.gamesPlayed)} avg per game`
                              : "No cells opened"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "inventory" && (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                        <Coins className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Inventory Coming Soon
                      </h3>
                      <p className="max-w-md mx-auto">
                        You'll soon be able to collect and use items to customize your profile and gain advantages in
                        the game!
                      </p>
                    </div>
                  )}

                  {activeTab === "achievements" && (
                    <div>
                      {userAchievements && userAchievements.length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {userAchievements.map((ach, idx) => (
                            <div key={ach.id || idx} className="flex items-center gap-3 bg-gray-100 dark:bg-gray-700/50 p-3 rounded-lg">
                              {ach.image && <img src={ach.image} alt={ach.name} className="w-8 h-8 rounded" />}
                              <div>
                                <div className="font-semibold text-gray-800 dark:text-white">{ach.name}</div>
                                {ach.rarity && (
                                  <span className="text-xs font-medium text-purple-500 mr-2">{ach.rarity}</span>
                                )}
                                {ach.description && (
                                  <div className="text-xs text-gray-500 dark:text-gray-300">{ach.description}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-gray-500 dark:text-gray-400">No achievements yet</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">No user data available</div>
          )}
        </CardContent>

        <CardFooter className="border-t border-gray-200 dark:border-gray-700 flex justify-end p-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </CardFooter>
      </Card>

      <style jsx>{`
        @keyframes rainbow {
          0% { filter: hue-rotate(0deg); }
          100% { filter: hue-rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
