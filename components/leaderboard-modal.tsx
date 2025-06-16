"use client"
import { useState, useEffect } from "react"
import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { X, Trophy, Bomb, Target, Crown, Medal, Award, Star, Coins, Gamepad, RefreshCw } from "lucide-react"
import { db } from "@/lib/firebase"
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from "firebase/firestore"

interface LeaderboardModalProps {
  isOpen: boolean
  onClose: () => void
}

interface LeaderboardEntry {
  id: string
  userId: number
  username: string
  email: string
  role: string
  customRole?: string
  customRoleColor?: string
  photoURL?: string
  experience: number
  level: number
  coins: number
  gamesPlayed: number
  gamesWon: number
  minesDefused: number
  cellsOpened: number
  winRate: number
  createdAt: Date
  lastActive?: Date
  achievements?: string[]
  adminRewards?: any[]
}

interface UserHoverCardProps {
  user: LeaderboardEntry
  position: { x: number; y: number }
  onClose: () => void
}

const calculateLevel = (experience: number) => {
  return Math.floor(Math.sqrt(experience / 100)) + 1
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

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toString()
}

function UserHoverCard({ user, position, onClose }: UserHoverCardProps) {
  return (
    <div
      className="fixed z-[100] pointer-events-none"
      style={{
        left: `${Math.min(position.x, window.innerWidth - 320)}px`,
        top: `${Math.max(position.y - 200, 10)}px`,
      }}
    >
      <Card className="w-80 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl pointer-events-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                {user.photoURL ? (
                  <img
                    src={user.photoURL || "/placeholder.svg"}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg font-bold text-gray-600 dark:text-gray-300">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">{user.username}</h3>
                <div className="flex items-center gap-2">
                  {user.customRole ? (
                    <Badge
                      style={{
                        backgroundColor: `${user.customRoleColor}20`,
                        color: user.customRoleColor,
                        borderColor: user.customRoleColor,
                      }}
                      className="text-xs border"
                    >
                      {user.customRole}
                    </Badge>
                  ) : (
                    <Badge className={`text-xs ${getRoleColor(user.role)}`}>{getRoleName(user.role)}</Badge>
                  )}
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">Level {user.level}</span>
                  </div>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                <Coins className="h-3 w-3 text-yellow-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Coins</span>
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{formatNumber(user.coins)}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                <Trophy className="h-3 w-3 text-green-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Win Rate</span>
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{user.winRate.toFixed(1)}%</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                <Bomb className="h-3 w-3 text-red-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Mines</span>
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{formatNumber(user.minesDefused)}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
              <div className="flex items-center gap-1 mb-1">
                <Target className="h-3 w-3 text-blue-500" />
                <span className="text-xs text-gray-600 dark:text-gray-400">Cells</span>
              </div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">{formatNumber(user.cellsOpened)}</p>
            </div>
          </div>

          {/* Admin Rewards */}
          {user.adminRewards && user.adminRewards.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Admin Rewards</h4>
              <div className="flex flex-wrap gap-1">
                {user.adminRewards.slice(0, 3).map((reward, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/30 px-2 py-1 rounded text-xs"
                  >
                    {reward.image && (
                      <img src={reward.image || "/placeholder.svg"} alt={reward.name} className="w-4 h-4" />
                    )}
                    <span className="text-purple-700 dark:text-purple-300">{reward.name}</span>
                  </div>
                ))}
                {user.adminRewards.length > 3 && (
                  <span className="text-xs text-gray-500">+{user.adminRewards.length - 3} more</span>
                )}
              </div>
            </div>
          )}

          {/* Achievements Preview */}
          {user.achievements && user.achievements.length > 0 && (
            <div>
              <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Recent Achievements</h4>
              <div className="flex flex-wrap gap-1">
                {user.achievements.slice(0, 3).map((achievement, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {achievement}
                  </Badge>
                ))}
                {user.achievements.length > 3 && (
                  <span className="text-xs text-gray-500">+{user.achievements.length - 3} more</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
  const [activeCategory, setActiveCategory] = useState("experience")
  const [activePeriod, setActivePeriod] = useState("all-time")
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null)
  const [hoveredUser, setHoveredUser] = useState<{ user: LeaderboardEntry; position: { x: number; y: number } } | null>(
    null,
  )

  const categories = [
    { id: "experience", name: "Experience & Level", icon: Star, field: "experience" },
    { id: "coins", name: "Current Gold", icon: Coins, field: "coins" },
    { id: "games", name: "Games Played", icon: Gamepad, field: "gamesPlayed" },
    { id: "wins", name: "Victories", icon: Trophy, field: "gamesWon" },
    { id: "mines", name: "Mines Defused", icon: Bomb, field: "minesDefused" },
    { id: "cells", name: "Cells Opened", icon: Target, field: "cellsOpened" },
  ]

  const periods = [
    { id: "daily", name: "Daily" },
    { id: "weekly", name: "Weekly" },
    { id: "monthly", name: "Monthly" },
    { id: "all-time", name: "All Time" },
  ]

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const category = categories.find((c) => c.id === activeCategory)
      if (!category) return

      let usersQuery = query(collection(db, "users"), orderBy(category.field, "desc"), limit(100))

      // For time-based periods, we would need to filter by date
      // This is a simplified version - in production you'd want to store daily/weekly/monthly stats
      if (activePeriod !== "all-time") {
        const now = new Date()
        const startDate = new Date()

        switch (activePeriod) {
          case "daily":
            startDate.setHours(0, 0, 0, 0)
            break
          case "weekly":
            startDate.setDate(now.getDate() - 7)
            break
          case "monthly":
            startDate.setMonth(now.getMonth() - 1)
            break
        }

        // Note: This is simplified. In production, you'd want separate collections for period-based stats
        usersQuery = query(
          collection(db, "users"),
          where("lastActive", ">=", Timestamp.fromDate(startDate)),
          orderBy("lastActive", "desc"),
          orderBy(category.field, "desc"),
          limit(100),
        )
      }

      const snapshot = await getDocs(usersQuery)
      const users = snapshot.docs.map((doc) => {
        const data = doc.data()
        const experience = data.experience || 0
        const gamesPlayed = data.gamesPlayed || 0
        const gamesWon = data.gamesWon || 0

        return {
          id: doc.id,
          userId: data.userId || 0,
          username: data.username || "Unknown",
          email: data.email || "",
          role: data.role || "user",
          customRole: data.customRole,
          customRoleColor: data.customRoleColor,
          photoURL: data.photoURL,
          experience,
          level: calculateLevel(experience),
          coins: data.coins || 0,
          gamesPlayed,
          gamesWon,
          minesDefused: data.minesDefused || 0,
          cellsOpened: data.cellsOpened || 0,
          winRate: gamesPlayed > 0 ? (gamesWon / gamesPlayed) * 100 : 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActive: data.lastActive?.toDate(),
          achievements: data.achievements || [],
          adminRewards: data.adminRewards || [],
        }
      })

      setLeaderboardData(users)

      // Calculate next update time
      const now = new Date()
      const nextUpdateTime = new Date()
      switch (activePeriod) {
        case "daily":
          nextUpdateTime.setDate(now.getDate() + 1)
          nextUpdateTime.setHours(0, 0, 0, 0)
          break
        case "weekly":
          nextUpdateTime.setDate(now.getDate() + (7 - now.getDay()))
          nextUpdateTime.setHours(0, 0, 0, 0)
          break
        case "monthly":
          nextUpdateTime.setMonth(now.getMonth() + 1)
          nextUpdateTime.setDate(1)
          nextUpdateTime.setHours(0, 0, 0, 0)
          break
        default:
          nextUpdateTime.setHours(now.getHours() + 1, 0, 0, 0)
      }
      setNextUpdate(nextUpdateTime)
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard()
    }
  }, [isOpen, activeCategory, activePeriod])

  const handleUserHover = (user: LeaderboardEntry, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredUser({
      user,
      position: { x: rect.right + 10, y: rect.top },
    })
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-bold text-gray-600 dark:text-gray-400">#{position}</span>
    }
  }

  const getValueDisplay = (user: LeaderboardEntry) => {
    switch (activeCategory) {
      case "experience":
        return `${formatNumber(user.experience)} XP (Level ${user.level})`
      case "coins":
        return `${formatNumber(user.coins)} Gold`
      case "games":
        return `${formatNumber(user.gamesPlayed)} (${user.winRate.toFixed(1)}% WR)`
      case "wins":
        return formatNumber(user.gamesWon)
      case "mines":
        return formatNumber(user.minesDefused)
      case "cells":
        return formatNumber(user.cellsOpened)
      default:
        return "0"
    }
  }

  if (!isOpen) return null

  const currentCategory = categories.find((c) => c.id === activeCategory)
  const currentPeriod = periods.find((p) => p.id === activePeriod)

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-3xl bg-white/90 dark:bg-gray-900/95 max-h-[80vh] overflow-hidden shadow-xl rounded-2xl border-0 backdrop-blur-md">
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-transparent">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Trophy className="h-6 w-6 text-yellow-500" />
                Global Leaderboards
              </CardTitle>
              {nextUpdate && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Next update: {nextUpdate.toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={fetchLeaderboard} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 bg-transparent">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-transparent">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Category</label>
                  <Select value={activeCategory} onValueChange={setActiveCategory}>
                    <SelectTrigger className="bg-white dark:bg-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <category.icon className="h-4 w-4" />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Time Period</label>
                  <Select value={activePeriod} onValueChange={setActivePeriod}>
                    <SelectTrigger className="bg-white dark:bg-gray-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((period) => (
                        <SelectItem key={period.id} value={period.id}>
                          {period.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent bg-transparent">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800 dark:border-white"></div>
                </div>
              ) : leaderboardData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-separate border-spacing-y-2 bg-transparent">
                    <thead>
                      <tr className="bg-transparent text-gray-700 dark:text-gray-300">
                        <th className="px-3 py-2 rounded-l-xl text-left font-semibold">#</th>
                        <th className="px-3 py-2 text-left font-semibold">User</th>
                        <th className="px-3 py-2 text-left font-semibold">Level</th>
                        <th className="px-3 py-2 text-left font-semibold">{currentCategory?.name}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardData.map((user, index) => (
                        <tr
                          key={user.id}
                          className={`group transition-all hover:scale-[1.01] hover:shadow-md bg-gray-900/90 dark:bg-gray-900/90 border-0 rounded-xl ${index < 3 ? "ring-2 ring-yellow-400/30 dark:ring-yellow-600/30" : ""}`}
                          style={{ boxShadow: index < 3 ? '0 2px 16px 0 rgba(255, 215, 0, 0.06)' : undefined }}
                          onMouseEnter={(e) => handleUserHover(user, e)}
                          onMouseLeave={() => setHoveredUser(null)}
                        >
                          <td className="px-3 py-2 align-middle font-bold text-lg text-center rounded-l-xl">
                            {getRankIcon(index + 1)}
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden border border-gray-300 dark:border-gray-600">
                                {user.photoURL ? (
                                  <img
                                    src={user.photoURL || "/placeholder.svg"}
                                    alt={user.username}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-base font-bold text-gray-600 dark:text-gray-300">
                                    {user.username.charAt(0).toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-white">{user.username}</span>
                                  {user.customRole ? (
                                    <Badge
                                      style={{
                                        backgroundColor: '#181C23', // тёмный фон
                                        color: user.customRoleColor || '#fff',
                                        borderColor: user.customRoleColor || '#222',
                                      }}
                                      className="text-xs px-2 py-0.5 rounded-full font-semibold shadow-none border-0"
                                    >
                                      {user.customRole}
                                    </Badge>
                                  ) : (
                                    user.role !== "user" && (
                                      <Badge
                                        className={`text-xs px-2 py-0.5 rounded-full font-semibold shadow-none border-0 bg-gray-900/90 dark:bg-gray-900/90 ${getRoleColor(user.role)}`}
                                        style={{backgroundColor: '#181C23'}}
                                      >
                                        {getRoleName(user.role)}
                                      </Badge>
                                    )
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span>#{user.userId}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <span className="inline-flex items-center gap-1 font-semibold text-purple-400 dark:text-purple-300">
                              <Star className="h-4 w-4" />
                              {user.level}
                            </span>
                          </td>
                          <td className="px-3 py-2 align-middle font-semibold text-right rounded-r-xl text-gray-100 dark:text-gray-100">
                            {getValueDisplay(user)}
                            {activeCategory === "games" && (
                              <div className="text-xs text-gray-400 dark:text-gray-400">{user.gamesWon} wins</div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No data available for this period</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Hover Card */}
      {hoveredUser && (
        <UserHoverCard user={hoveredUser.user} position={hoveredUser.position} onClose={() => setHoveredUser(null)} />
      )}
    </>
  )
}
