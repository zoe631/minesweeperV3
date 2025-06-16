"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Trophy,
  Skull,
  Coins,
  Zap,
  TrendingUp,
  TrendingDown,
  Bomb,
  Target,
  BarChart3,
  Gift,
  Gamepad,
} from "lucide-react"

interface GameResultModalProps {
  isOpen: boolean
  onClose: () => void
  gameWon: boolean
  rewards: {
    coins: number
    experience: number
  }
  statistics: {
    winRateChange: number
    cellsOpened: number
    minesDefused: number
    gamesPlayedChange: number
  }
}

export function GameResultModal({ isOpen, onClose, gameWon, rewards, statistics }: GameResultModalProps) {
  if (!isOpen) return null

  const getStatColor = (value: number) => {
    if (value > 0) return "text-green-500"
    if (value < 0) return "text-red-500"
    return "text-gray-500"
  }

  const getStatIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4" />
    if (value < 0) return <TrendingDown className="h-4 w-4" />
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className={`h-2 w-full ${gameWon ? "bg-green-500" : "bg-red-500"}`}></div>
        <CardHeader className="relative pb-8 pt-6">
          <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 w-20 h-20 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center border-4 border-white dark:border-gray-800">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center ${gameWon ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}
            >
              {gameWon ? <Trophy className="h-8 w-8 text-green-500" /> : <Skull className="h-8 w-8 text-red-500" />}
            </div>
          </div>

          <CardTitle
            className={`text-center text-2xl font-bold mt-4 ${gameWon ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
          >
            {gameWon ? "Victory!" : "Game Over"}
          </CardTitle>
          <p className="text-center text-gray-500 dark:text-gray-400">
            {gameWon
              ? "Congratulations! You've successfully cleared the minefield."
              : "Better luck next time! Keep practicing to improve your skills."}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Rewards Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-500" />
              Rewards Earned
            </h3>

            <div className="grid grid-cols-2 gap-4">
              {/* Coins */}
              <div
                className={`p-4 rounded-lg border ${gameWon ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700" : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"}`}
              >
                <div className="flex items-center justify-center mb-2">
                  <Coins className={`h-6 w-6 ${gameWon ? "text-yellow-600 dark:text-yellow-400" : "text-gray-400"}`} />
                </div>
                <div className="text-center">
                  <p
                    className={`text-2xl font-bold ${gameWon ? "text-yellow-800 dark:text-yellow-200" : "text-gray-500"}`}
                  >
                    {gameWon ? `+${rewards.coins}` : "0"}
                  </p>
                  <p className={`text-sm ${gameWon ? "text-yellow-700 dark:text-yellow-300" : "text-gray-500"}`}>
                    Coins
                  </p>
                </div>
              </div>

              {/* Experience */}
              <div className="p-4 rounded-lg border bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-center mb-2">
                  <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">+{rewards.experience}</p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">Experience</p>
                </div>
              </div>
            </div>

            {!gameWon && rewards.experience > 0 && (
              <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2">
                💡 You still earned experience for the mines you successfully identified!
              </div>
            )}
          </div>

          {/* Game Stats Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Game Statistics
            </h3>

            <div className="space-y-3">
              {/* Cells Opened */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cells Opened</span>
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{statistics.cellsOpened}</span>
              </div>

              {/* Mines Defused */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <Bomb className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mines Defused</span>
                </div>
                <span className="font-semibold text-gray-800 dark:text-gray-200">{statistics.minesDefused}</span>
              </div>

              {/* Win Rate */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Win Rate</span>
                </div>
                <div className={`flex items-center gap-1 ${getStatColor(statistics.winRateChange)}`}>
                  {getStatIcon(statistics.winRateChange)}
                  <span className="font-semibold">
                    {statistics.winRateChange > 0 ? "+" : ""}
                    {statistics.winRateChange.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Games Played */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <Gamepad className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Games Played</span>
                </div>
                <div className="flex items-center gap-1 text-blue-500">
                  <TrendingUp className="h-4 w-4" />
                  <span className="font-semibold">+{statistics.gamesPlayedChange}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <div className="pt-4">
            <Button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
            >
              Continue Playing
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
