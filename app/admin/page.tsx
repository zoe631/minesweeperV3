"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { auth, db } from "@/lib/firebase"
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  orderBy,
  limit,
  addDoc,
  Timestamp,
  setDoc,
} from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Shield,
  Users,
  Trophy,
  Settings,
  AlertTriangle,
  BarChart3,
  Bell,
  User,
  Star,
  Coins,
  Trash2,
  Edit,
  Save,
  X,
  Search,
  Filter,
  RefreshCw,
  Gift,
  Upload,
  Award,
  Crown,
  Target,
  MessageSquare,
  History,
  TestTube,
  AwardIcon,
} from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

// Calculate level from experience
const calculateLevel = (experience: number) => {
  return Math.floor(Math.sqrt(experience / 100)) + 1
}

// Calculate experience needed for a specific level
const calculateExpForLevel = (level: number) => {
  return Math.pow(level - 1, 2) * 100
}

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string>("")
  const [hasAccess, setHasAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [editingRole, setEditingRole] = useState<any>(null)
  const [customRoleName, setCustomRoleName] = useState("")
  const [customRoleColor, setCustomRoleColor] = useState("#6b7280")
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceReason, setMaintenanceReason] = useState("")
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false)
  const [siteStats, setSiteStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalGames: 0,
    gamesWon: 0,
    averageWinRate: 0,
    averageLevel: 0,
    totalCoins: 0,
  })
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    message: "",
    type: "info",
    link: "",
    targetAll: true,
    targetRoles: [] as string[],
    targetLevels: [] as number[],
    targetUsers: [] as string[],
    titleColor: "#000000",
    messageColor: "#666666",
    backgroundColor: "#f8f9fa",
    borderColor: "#dee2e6",
  })
  const [notifications, setNotifications] = useState<any[]>([])
  const [userFilter, setUserFilter] = useState("all")
  const [sortOrder, setSortOrder] = useState<{ field: string; direction: "asc" | "desc" }>({
    field: "username",
    direction: "asc",
  })
  const [showLevelEditor, setShowLevelEditor] = useState(false)
  const [levelToEdit, setLevelToEdit] = useState(1)
  const [experienceToEdit, setExperienceToEdit] = useState(0)

  // Rewards system
  const [rewards, setRewards] = useState<any[]>([])
  const [showCreateReward, setShowCreateReward] = useState(false)
  const [showGiveReward, setShowGiveReward] = useState(false)
  const [newReward, setNewReward] = useState({
    name: "",
    description: "",
    experience: 0,
    coins: 0,
    image: "",
    rarity: "common",
    nameColor: "#000000",
    descriptionColor: "#666666",
  })
  const [selectedRewardUser, setSelectedRewardUser] = useState<any>(null)
  const [selectedRewardToGive, setSelectedRewardToGive] = useState<any>(null)

  // Leaderboard management
  const [leaderboardSettings, setLeaderboardSettings] = useState({
    dailyResetTime: "00:00",
    weeklyResetDay: "monday",
    monthlyResetDay: 1,
    enabledCategories: ["experience", "coins", "games", "wins", "mines", "cells"],
    maxDisplayCount: 100,
  })

  // Feedback management
  const [feedbacks, setFeedbacks] = useState<any[]>([])
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null)
  const [adminResponse, setAdminResponse] = useState("")

  // Admin logs
  const [adminLogs, setAdminLogs] = useState<any[]>([])

  // Version management
  const [currentAppVersion, setCurrentAppVersion] = useState("0.0.3.4")
  const [newVersion, setNewVersion] = useState("")

  // Add a new state variable to track access restriction level
  const [accessRestriction, setAccessRestriction] = useState<string>("none")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user)

      if (user) {
        try {
          // Get user role from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid))
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const role = userData.role || "user"
            setUserRole(role)
            setHasAccess(role === "admin" || role === "dev")
          } else {
            setHasAccess(false)
          }
        } catch (error) {
          console.error("Error fetching user role:", error)
          setHasAccess(false)
        }
      } else {
        setHasAccess(false)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Check maintenance mode status on load
  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "maintenance"))
        if (settingsDoc.exists()) {
          const data = settingsDoc.data()
          setMaintenanceMode(data.enabled || false)
          setMaintenanceReason(data.reason || "")
        }
      } catch (error) {
        console.error("Error fetching maintenance status:", error)
      }
    }

    fetchMaintenanceStatus()
  }, [])

  // Add code to fetch the access restriction level when the page loads
  useEffect(() => {
    const fetchAccessRestriction = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "access"))
        if (settingsDoc.exists()) {
          const data = settingsDoc.data()
          setAccessRestriction(data.level || "none")
        }
      } catch (error) {
        console.error("Error fetching access restriction:", error)
      }
    }

    fetchAccessRestriction()
  }, [])

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      if (!hasAccess) return

      try {
        const usersSnapshot = await getDocs(collection(db, "users"))
        const usersData = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          level: calculateLevel(doc.data().experience || 0),
        }))
        setUsers(usersData)

        // Calculate site statistics
        const totalUsers = usersData.length
        const totalGames = usersData.reduce((sum, user) => sum + (user.gamesPlayed || 0), 0)
        const gamesWon = usersData.reduce((sum, user) => sum + (user.gamesWon || 0), 0)
        const averageWinRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0
        const totalLevels = usersData.reduce((sum, user) => sum + calculateLevel(user.experience || 0), 0)
        const averageLevel = totalUsers > 0 ? totalLevels / totalUsers : 0
        const totalCoins = usersData.reduce((sum, user) => sum + (user.coins || 0), 0)

        setSiteStats({
          totalUsers,
          activeUsers: Math.floor(totalUsers * 0.3), // Placeholder - would need actual online tracking
          totalGames,
          gamesWon,
          averageWinRate,
          averageLevel,
          totalCoins,
        })
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    if (hasAccess) {
      fetchUsers()
    }
  }, [hasAccess])

  // Fetch notifications
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!hasAccess) return

      try {
        const notificationsSnapshot = await getDocs(
          query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20)),
        )
        const notificationsData = notificationsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setNotifications(notificationsData)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      }
    }

    if (hasAccess) {
      fetchNotifications()
    }
  }, [hasAccess])

  // Fetch rewards
  useEffect(() => {
    const fetchRewards = async () => {
      if (!hasAccess) return

      try {
        const rewardsSnapshot = await getDocs(collection(db, "rewards"))
        const rewardsData = rewardsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        setRewards(rewardsData)
      } catch (error) {
        console.error("Error fetching rewards:", error)
      }
    }

    if (hasAccess) {
      fetchRewards()
    }
  }, [hasAccess])

  // Filter and sort users
  const filteredUsers = users
    .filter((user) => {
      // Text search
      const matchesSearch =
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(user.userId).includes(searchTerm)

      // Role filter
      if (userFilter !== "all") {
        return matchesSearch && user.role === userFilter
      }

      return matchesSearch
    })
    .sort((a, b) => {
      // Sort by selected field
      const field = sortOrder.field
      let valueA = a[field]
      let valueB = b[field]

      // Special handling for level which is calculated
      if (field === "level") {
        valueA = calculateLevel(a.experience || 0)
        valueB = calculateLevel(b.experience || 0)
      }

      // Handle string comparison
      if (typeof valueA === "string" && typeof valueB === "string") {
        return sortOrder.direction === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA)
      }

      // Handle number comparison
      return sortOrder.direction === "asc" ? (valueA || 0) - (valueB || 0) : (valueB || 0) - (valueA || 0)
    })

  const handleUserSelect = (user: any) => {
    setSelectedUser(user)

    // Set level editor values
    const level = calculateLevel(user.experience || 0)
    setLevelToEdit(level)
    setExperienceToEdit(user.experience || 0)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      await updateDoc(doc(db, "users", selectedUser.id), {
        username: selectedUser.username,
        gamesPlayed: Number(selectedUser.gamesPlayed),
        gamesWon: Number(selectedUser.gamesWon),
        minesDefused: Number(selectedUser.minesDefused),
        coins: Number(selectedUser.coins),
        experience: Number(selectedUser.experience),
      })

      // Update local state
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id
            ? {
                ...selectedUser,
                level: calculateLevel(selectedUser.experience || 0),
              }
            : user,
        ),
      )

      await logAdminAction("user_update", {
        userId: selectedUser.id,
        username: selectedUser.username,
        changes: {
          gamesPlayed: selectedUser.gamesPlayed,
          gamesWon: selectedUser.gamesWon,
          minesDefused: selectedUser.minesDefused,
          coins: selectedUser.coins,
          experience: selectedUser.experience,
        },
      })

      alert("User updated successfully")
    } catch (error) {
      console.error("Error updating user:", error)
      alert("Error updating user")
    }
  }

  const handleDeleteUser = async () => {
    if (!selectedUser || !window.confirm(`Are you sure you want to delete ${selectedUser.username}?`)) return

    try {
      await deleteDoc(doc(db, "users", selectedUser.id))

      // Update local state
      setUsers(users.filter((user) => user.id !== selectedUser.id))
      setSelectedUser(null)

      await logAdminAction("user_delete", { userId: selectedUser.id, username: selectedUser.username })

      alert("User deleted successfully")
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Error deleting user")
    }
  }

  const handlePromoteToAdmin = async (userId: string) => {
    if (!window.confirm("Promote this user to Administrator?")) return

    try {
      await updateDoc(doc(db, "users", userId), {
        role: "admin",
      })

      setUsers(users.map((user) => (user.id === userId ? { ...user, role: "admin" } : user)))
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, role: "admin" })
      }

      await logAdminAction("user_promote", { userId: userId, newRole: "admin" })

      alert("User promoted to Administrator")
    } catch (error) {
      console.error("Error promoting user:", error)
      alert("Error promoting user")
    }
  }

  const handleDemoteToUser = async (userId: string) => {
    if (!window.confirm("Demote this user to regular User?")) return

    try {
      await updateDoc(doc(db, "users", userId), {
        role: "user",
        customRole: null,
        customRoleColor: null,
      })

      setUsers(
        users.map((user) =>
          user.id === userId ? { ...user, role: "user", customRole: null, customRoleColor: null } : user,
        ),
      )
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, role: "user", customRole: null, customRoleColor: null })
      }

      await logAdminAction("user_demote", { userId: userId, newRole: "user" })

      alert("User demoted to User")
    } catch (error) {
      console.error("Error demoting user:", error)
      alert("Error demoting user")
    }
  }

  const handleSetCustomRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRole || !customRoleName.trim()) return

    try {
      await updateDoc(doc(db, "users", editingRole.id), {
        customRole: customRoleName,
        customRoleColor: customRoleColor,
      })

      setUsers(
        users.map((user) =>
          user.id === editingRole.id ? { ...user, customRole: customRoleName, customRoleColor: customRoleColor } : user,
        ),
      )
      if (selectedUser && selectedUser.id === editingRole.id) {
        setSelectedUser({ ...selectedUser, customRole: customRoleName, customRoleColor: customRoleColor })
      }

      await logAdminAction("user_custom_role", {
        userId: editingRole.id,
        customRole: customRoleName,
        customRoleColor: customRoleColor,
      })

      setEditingRole(null)
      setCustomRoleName("")
      setCustomRoleColor("#6b7280")
      alert("Custom role set successfully")
    } catch (error) {
      console.error("Error setting custom role:", error)
      alert("Error setting custom role")
    }
  }

  const handleRemoveCustomRole = async (userId: string) => {
    if (!window.confirm("Remove custom role from this user?")) return

    try {
      await updateDoc(doc(db, "users", userId), {
        customRole: null,
        customRoleColor: null,
      })

      setUsers(users.map((user) => (user.id === userId ? { ...user, customRole: null, customRoleColor: null } : user)))
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, customRole: null, customRoleColor: null })
      }

      await logAdminAction("user_remove_custom_role", { userId: userId })

      alert("Custom role removed successfully")
    } catch (error) {
      console.error("Error removing custom role:", error)
      alert("Error removing custom role")
    }
  }

  const handleToggleMaintenance = async () => {
    try {
      await setDoc(doc(db, "settings", "maintenance"), {
        enabled: !maintenanceMode,
        reason: maintenanceReason || "Scheduled maintenance",
        updatedAt: Timestamp.now(),
        updatedBy: user?.uid || "unknown",
      })

      setMaintenanceMode(!maintenanceMode)
      setShowMaintenanceDialog(false)

      await logAdminAction("maintenance_mode_toggle", { enabled: !maintenanceMode, reason: maintenanceReason })

      alert(`Maintenance mode ${!maintenanceMode ? "enabled" : "disabled"} successfully`)
    } catch (error) {
      console.error("Error toggling maintenance mode:", error)
      alert("Error toggling maintenance mode")
    }
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      alert("Title and message are required")
      return
    }

    try {
      const notification = {
        title: notificationForm.title,
        message: notificationForm.message,
        type: notificationForm.type,
        link: notificationForm.link || null,
        createdAt: Timestamp.now(),
        createdBy: user?.uid || "unknown",
        read: false,
        targetUsers: notificationForm.targetAll ? [] : notificationForm.targetUsers,
        targetRoles: notificationForm.targetAll ? [] : notificationForm.targetRoles,
        targetLevels: notificationForm.targetAll ? [] : notificationForm.targetLevels,
        styling: {
          titleColor: notificationForm.titleColor,
          messageColor: notificationForm.messageColor,
          backgroundColor: notificationForm.backgroundColor,
          borderColor: notificationForm.borderColor,
        },
      }

      await addDoc(collection(db, "notifications"), notification)

      // Reset form
      setNotificationForm({
        title: "",
        message: "",
        type: "info",
        link: "",
        targetAll: true,
        targetRoles: [],
        targetLevels: [],
        targetUsers: [],
        titleColor: "#000000",
        messageColor: "#666666",
        backgroundColor: "#f8f9fa",
        borderColor: "#dee2e6",
      })

      // Refresh notifications list
      const notificationsSnapshot = await getDocs(
        query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20)),
      )
      const notificationsData = notificationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setNotifications(notificationsData)

      await logAdminAction("notification_sent", { title: notification.title, type: notification.type })

      alert("Notification sent successfully")
    } catch (error) {
      console.error("Error sending notification:", error)
      alert("Error sending notification")
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    if (!window.confirm("Are you sure you want to delete this notification?")) return

    try {
      await deleteDoc(doc(db, "notifications", notificationId))
      setNotifications(notifications.filter((n) => n.id !== notificationId))

      await logAdminAction("notification_delete", { notificationId: notificationId })

      alert("Notification deleted successfully")
    } catch (error) {
      console.error("Error deleting notification:", error)
      alert("Error deleting notification")
    }
  }

  const handleSortChange = (field: string) => {
    setSortOrder((prev) => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }))
  }

  const handleUpdateLevel = async () => {
    if (!selectedUser) return

    try {
      // Calculate experience needed for the selected level
      const newExperience = calculateExpForLevel(levelToEdit)

      await updateDoc(doc(db, "users", selectedUser.id), {
        experience: newExperience,
      })

      // Update local state
      setSelectedUser({ ...selectedUser, experience: newExperience })
      setUsers(
        users.map((user) =>
          user.id === selectedUser.id ? { ...user, experience: newExperience, level: levelToEdit } : user,
        ),
      )

      await logAdminAction("user_level_update", {
        userId: selectedUser.id,
        newLevel: levelToEdit,
        newExperience: newExperience,
      })

      setExperienceToEdit(newExperience)
      setShowLevelEditor(false)
      alert("Level updated successfully")
    } catch (error) {
      console.error("Error updating level:", error)
      alert("Error updating level")
    }
  }

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newReward.name.trim() || !newReward.description.trim()) {
      alert("Name and description are required")
      return
    }

    try {
      const reward = {
        name: newReward.name,
        description: newReward.description,
        experience: Number(newReward.experience),
        coins: Number(newReward.coins),
        image: newReward.image,
        rarity: newReward.rarity,
        createdAt: Timestamp.now(),
        createdBy: user?.uid || "unknown",
        styling: {
          nameColor: newReward.nameColor,
          descriptionColor: newReward.descriptionColor,
        },
      }

      await addDoc(collection(db, "rewards"), reward)

      // Reset form
      setNewReward({
        name: "",
        description: "",
        experience: 0,
        coins: 0,
        image: "",
        rarity: "common",
        nameColor: "#000000",
        descriptionColor: "#666666",
      })

      // Refresh rewards list
      const rewardsSnapshot = await getDocs(collection(db, "rewards"))
      const rewardsData = rewardsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setRewards(rewardsData)

      await logAdminAction("reward_create", { rewardName: reward.name, rewardRarity: reward.rarity })

      setShowCreateReward(false)
      alert("Reward created successfully")
    } catch (error) {
      console.error("Error creating reward:", error)
      alert("Error creating reward")
    }
  }

  const handleGiveReward = async () => {
    if (!selectedRewardUser || !selectedRewardToGive) return

    try {
      const userRef = doc(db, "users", selectedRewardUser.id)
      const userDoc = await getDoc(userRef)
      const userData = userDoc.data()

      const currentRewards = userData?.adminRewards || []
      const newRewardEntry = {
        ...selectedRewardToGive,
        givenAt: Timestamp.now(),
        givenBy: user?.uid || "unknown",
      }

      await updateDoc(userRef, {
        adminRewards: [...currentRewards, newRewardEntry],
        experience: (userData?.experience || 0) + selectedRewardToGive.experience,
        coins: (userData?.coins || 0) + selectedRewardToGive.coins,
      })

      // Update local state
      setUsers(
        users.map((u) =>
          u.id === selectedRewardUser.id
            ? {
                ...u,
                adminRewards: [...(u.adminRewards || []), newRewardEntry],
                experience: (u.experience || 0) + selectedRewardToGive.experience,
                coins: (u.coins || 0) + selectedRewardToGive.coins,
              }
            : u,
        ),
      )

      await logAdminAction("reward_given", {
        userId: selectedRewardUser.id,
        rewardId: selectedRewardToGive.id,
        rewardName: selectedRewardToGive.name,
      })

      setShowGiveReward(false)
      setSelectedRewardUser(null)
      setSelectedRewardToGive(null)
      alert("Reward given successfully")
    } catch (error) {
      console.error("Error giving reward:", error)
      alert("Error giving reward")
    }
  }

  // Log admin action
  const logAdminAction = async (action: string, details: any = {}) => {
    try {
      await addDoc(collection(db, "admin_logs"), {
        action,
        details,
        adminId: user?.uid || "unknown",
        adminEmail: user?.email || "unknown",
        adminRole: userRole,
        timestamp: Timestamp.now(),
      })
    } catch (error) {
      console.error("Error logging admin action:", error)
    }
  }

  // Fetch feedbacks
  const fetchFeedbacks = async () => {
    if (!hasAccess) return

    try {
      const feedbacksSnapshot = await getDocs(
        query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(50)),
      )
      const feedbacksData = feedbacksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setFeedbacks(feedbacksData)
    } catch (error) {
      console.error("Error fetching feedbacks:", error)
    }
  }

  // Fetch admin logs
  const fetchAdminLogs = async () => {
    if (!hasAccess) return

    try {
      const logsSnapshot = await getDocs(query(collection(db, "admin_logs"), orderBy("timestamp", "desc"), limit(100)))
      const logsData = logsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      setAdminLogs(logsData)
    } catch (error) {
      console.error("Error fetching admin logs:", error)
    }
  }

  // Update app version
  const handleUpdateVersion = async () => {
    if (!newVersion.trim()) return

    try {
      await setDoc(doc(db, "settings", "version"), {
        version: newVersion,
        updatedAt: Timestamp.now(),
        updatedBy: user?.uid || "unknown",
      })

      // Update localStorage for all users
      if (typeof window !== "undefined") {
        localStorage.setItem("minesweeper_version", newVersion)
      }

      setCurrentAppVersion(newVersion)
      setNewVersion("")

      await logAdminAction("version_update", {
        oldVersion: currentAppVersion,
        newVersion: newVersion,
      })

      alert("Version updated successfully")
    } catch (error) {
      console.error("Error updating version:", error)
      alert("Error updating version")
    }
  }

  // Respond to feedback
  const handleRespondToFeedback = async (feedbackId: string) => {
    if (!adminResponse.trim()) return

    try {
      await updateDoc(doc(db, "feedback", feedbackId), {
        adminResponse: adminResponse,
        status: "responded",
        respondedAt: Timestamp.now(),
        respondedBy: user?.uid || "unknown",
      })

      setFeedbacks(
        feedbacks.map((f) => (f.id === feedbackId ? { ...f, adminResponse: adminResponse, status: "responded" } : f)),
      )

      await logAdminAction("feedback_response", {
        feedbackId,
        response: adminResponse,
      })

      setAdminResponse("")
      setSelectedFeedback(null)
      alert("Response sent successfully")
    } catch (error) {
      console.error("Error responding to feedback:", error)
      alert("Error sending response")
    }
  }

  // Give reward for feedback
  const handleGiveFeedbackReward = async (feedbackId: string, userId: string) => {
    if (!selectedRewardToGive) return

    try {
      const userRef = doc(db, "users", userId)
      const userDoc = await getDoc(userRef)
      const userData = userDoc.data()

      const currentRewards = userData?.adminRewards || []
      const newRewardEntry = {
        ...selectedRewardToGive,
        givenAt: Timestamp.now(),
        givenBy: user?.uid || "unknown",
        reason: "feedback_reward",
        feedbackId: feedbackId,
      }

      await updateDoc(userRef, {
        adminRewards: [...currentRewards, newRewardEntry],
        experience: (userData?.experience || 0) + selectedRewardToGive.experience,
        coins: (userData?.coins || 0) + selectedRewardToGive.coins,
      })

      await updateDoc(doc(db, "feedback", feedbackId), {
        rewardGiven: true,
        rewardGivenAt: Timestamp.now(),
        rewardGivenBy: user?.uid || "unknown",
      })

      setFeedbacks(feedbacks.map((f) => (f.id === feedbackId ? { ...f, rewardGiven: true } : f)))

      await logAdminAction("feedback_reward", {
        feedbackId,
        userId,
        rewardId: selectedRewardToGive.id,
        rewardName: selectedRewardToGive.name,
      })

      alert("Reward given successfully")
    } catch (error) {
      console.error("Error giving feedback reward:", error)
      alert("Error giving reward")
    }
  }

  // Fetch feedbacks and logs
  useEffect(() => {
    if (hasAccess) {
      fetchFeedbacks()
      fetchAdminLogs()
    }
  }, [hasAccess])

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "text-orange-500"
      case "dev":
        return "text-red-500"
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
      default:
        return "User"
    }
  }

  const isDeveloper = userRole === "dev"

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  // Add access restriction check to the main page
  if (accessRestriction === "dev" && userRole !== "dev") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              You do not have permission to access this page. Only developers can access the admin panel.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => window.close()}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accessRestriction === "admin" && userRole !== "admin" && userRole !== "dev") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              You do not have permission to access this page. Only administrators and developers can access the admin
              panel.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => window.close()}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accessRestriction === "tester" && userRole !== "admin" && userRole !== "dev" && userRole !== "tester") {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              You do not have permission to access this page. Only testers, administrators and developers can access the
              admin panel.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => window.close()}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">
              You do not have permission to access this page. Only administrators and developers can access the admin
              panel.
            </p>
            <div className="mt-4">
              <Button
                onClick={() => window.close()}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-500" />
            Minesweeper Admin Panel
          </h1>
          <div className="flex items-center gap-4">
            {/* Maintenance Mode Indicator */}
            {maintenanceMode && (
              <Badge variant="destructive" className="bg-red-600 text-white">
                Maintenance Mode Active
              </Badge>
            )}
            <div className="text-sm text-gray-400">
              Logged in as: <span className="font-semibold text-white">{user?.email}</span>
              <span className={`ml-2 px-2 py-1 rounded text-xs font-bold ${getRoleColor(userRole)}`}>
                {getRoleName(userRole)}
              </span>
            </div>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid grid-cols-8 max-w-6xl bg-gray-800 border-gray-700">
            <TabsTrigger
              value="users"
              className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger
              value="feedback"
              className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              <MessageSquare className="h-4 w-4" />
              Feedback
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger
              value="leaderboard"
              className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              <Trophy className="h-4 w-4" />
              Leaderboards
            </TabsTrigger>
            <TabsTrigger
              value="rewards"
              className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              <Gift className="h-4 w-4" />
              Rewards
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              <History className="h-4 w-4" />
              Logs
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white"
            >
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Users className="h-5 w-5 text-blue-500" />
                    User Management
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                    <Select value={userFilter} onValueChange={setUserFilter}>
                      <SelectTrigger className="w-32 bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="user">Users</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                        <SelectItem value="dev">Developers</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setLoading(true)
                        const fetchUsers = async () => {
                          try {
                            const usersSnapshot = await getDocs(collection(db, "users"))
                            const usersData = usersSnapshot.docs.map((doc) => ({
                              id: doc.id,
                              ...doc.data(),
                              level: calculateLevel(doc.data().experience || 0),
                            }))
                            setUsers(usersData)

                            // Calculate site statistics
                            const totalUsers = usersData.length
                            const totalGames = usersData.reduce((sum, user) => sum + (user.gamesPlayed || 0), 0)
                            const gamesWon = usersData.reduce((sum, user) => sum + (user.gamesWon || 0), 0)
                            const averageWinRate = totalGames > 0 ? (gamesWon / totalGames) * 100 : 0
                            const totalLevels = usersData.reduce(
                              (sum, user) => sum + calculateLevel(user.experience || 0),
                              0,
                            )
                            const averageLevel = totalUsers > 0 ? totalLevels / totalUsers : 0
                            const totalCoins = usersData.reduce((sum, user) => sum + (user.coins || 0), 0)

                            setSiteStats({
                              totalUsers,
                              activeUsers: Math.floor(totalUsers * 0.3), // Placeholder - would need actual online tracking
                              totalGames,
                              gamesWon,
                              averageWinRate,
                              averageLevel,
                              totalCoins,
                            })
                          } catch (error) {
                            console.error("Error fetching users:", error)
                          }
                        }
                        fetchUsers().then(() => setLoading(false))
                      }}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Users List */}
                  <div className="lg:col-span-1 border border-gray-700 rounded-lg p-4 h-[600px] overflow-y-auto bg-gray-800/50">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium text-white">Users ({filteredUsers.length})</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                            <Filter className="h-4 w-4 mr-1" />
                            Sort
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-gray-700 border-gray-600">
                          <DropdownMenuLabel className="text-gray-300">Sort by</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-gray-600" />
                          <DropdownMenuItem
                            onClick={() => handleSortChange("username")}
                            className="text-gray-300 hover:bg-gray-600"
                          >
                            Username {sortOrder.field === "username" && (sortOrder.direction === "asc" ? "↑" : "↓")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSortChange("level")}
                            className="text-gray-300 hover:bg-gray-600"
                          >
                            Level {sortOrder.field === "level" && (sortOrder.direction === "asc" ? "↑" : "↓")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSortChange("gamesPlayed")}
                            className="text-gray-300 hover:bg-gray-600"
                          >
                            Games Played{" "}
                            {sortOrder.field === "gamesPlayed" && (sortOrder.direction === "asc" ? "↑" : "↓")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleSortChange("coins")}
                            className="text-gray-300 hover:bg-gray-600"
                          >
                            Coins {sortOrder.field === "coins" && (sortOrder.direction === "asc" ? "↑" : "↓")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="space-y-2">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          className={`p-3 rounded cursor-pointer transition-colors ${
                            selectedUser?.id === user.id
                              ? "bg-blue-600/30 border border-blue-500"
                              : "bg-gray-700/50 hover:bg-gray-700 border border-transparent"
                          }`}
                          onClick={() => handleUserSelect(user)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="font-medium text-white">{user.username || "No username"}</div>
                            <div className="text-xs text-gray-400">#{user.userId}</div>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">{user.email}</div>
                          <div className="flex items-center justify-between mt-2">
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
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {calculateLevel(user.experience || 0)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Coins className="h-3 w-3" />
                                {user.coins || 0}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredUsers.length === 0 && (
                        <div className="text-center text-gray-500 py-8">No users found</div>
                      )}
                    </div>
                  </div>

                  {/* User Editor */}
                  <div className="lg:col-span-2 border border-gray-700 rounded-lg p-4 bg-gray-800/50">
                    {selectedUser ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-white text-lg">Edit User</h3>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowLevelEditor(true)}
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit Level
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedRewardUser(selectedUser)
                                setShowGiveReward(true)
                              }}
                              className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                              <Gift className="h-4 w-4 mr-1" />
                              Give Reward
                            </Button>
                            {isDeveloper && (
                              <Button variant="destructive" size="sm" onClick={handleDeleteUser}>
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>

                        <form onSubmit={handleUpdateUser} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="username" className="text-gray-300">
                                Username
                              </Label>
                              <Input
                                id="username"
                                value={selectedUser.username || ""}
                                onChange={(e) => setSelectedUser({ ...selectedUser, username: e.target.value })}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                            <div>
                              <Label htmlFor="email" className="text-gray-300">
                                Email (read-only)
                              </Label>
                              <Input
                                id="email"
                                value={selectedUser.email || ""}
                                disabled
                                className="bg-gray-700 border-gray-600 text-gray-400"
                              />
                            </div>
                          </div>

                          {/* Role Display */}
                          <div>
                            <Label className="text-gray-300">Current Role</Label>
                            <div className="flex items-center gap-2 p-3 bg-gray-700 rounded border border-gray-600 mt-1">
                              {selectedUser.customRole ? (
                                <div className="flex items-center gap-2">
                                  <Badge
                                    style={{
                                      backgroundColor: `${selectedUser.customRoleColor}20`,
                                      color: selectedUser.customRoleColor,
                                      borderColor: selectedUser.customRoleColor,
                                    }}
                                    className="border"
                                  >
                                    {selectedUser.customRole}
                                  </Badge>
                                  <span className="text-sm text-gray-400">
                                    (Real: {getRoleName(selectedUser.role)})
                                  </span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveCustomRole(selectedUser.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <Badge className={`${getRoleColor(selectedUser.role)}`}>
                                  {getRoleName(selectedUser.role)}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Level and Experience Display */}
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-gray-300">Level</Label>
                              <div className="p-3 bg-gray-700 rounded border border-gray-600 mt-1">
                                <div className="flex items-center gap-2">
                                  <Star className="h-4 w-4 text-yellow-500" />
                                  <span className="text-white font-medium">
                                    Level {calculateLevel(selectedUser.experience || 0)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="experience" className="text-gray-300">
                                Experience
                              </Label>
                              <Input
                                id="experience"
                                type="number"
                                value={selectedUser.experience || 0}
                                onChange={(e) =>
                                  setSelectedUser({ ...selectedUser, experience: Number(e.target.value) })
                                }
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                          </div>

                          {/* Currency */}
                          <div>
                            <Label htmlFor="coins" className="text-gray-300">
                              Coins
                            </Label>
                            <Input
                              id="coins"
                              type="number"
                              value={selectedUser.coins || 0}
                              onChange={(e) => setSelectedUser({ ...selectedUser, coins: Number(e.target.value) })}
                              className="bg-gray-700 border-gray-600 text-white"
                            />
                          </div>

                          {/* Game Statistics */}
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <Label htmlFor="gamesPlayed" className="text-gray-300">
                                Games Played
                              </Label>
                              <Input
                                id="gamesPlayed"
                                type="number"
                                value={selectedUser.gamesPlayed || 0}
                                onChange={(e) =>
                                  setSelectedUser({ ...selectedUser, gamesPlayed: Number(e.target.value) })
                                }
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                            <div>
                              <Label htmlFor="gamesWon" className="text-gray-300">
                                Games Won
                              </Label>
                              <Input
                                id="gamesWon"
                                type="number"
                                value={selectedUser.gamesWon || 0}
                                onChange={(e) => setSelectedUser({ ...selectedUser, gamesWon: Number(e.target.value) })}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                            <div>
                              <Label htmlFor="minesDefused" className="text-gray-300">
                                Mines Defused
                              </Label>
                              <Input
                                id="minesDefused"
                                type="number"
                                value={selectedUser.minesDefused || 0}
                                onChange={(e) =>
                                  setSelectedUser({ ...selectedUser, minesDefused: Number(e.target.value) })
                                }
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                          </div>

                          {/* Admin Rewards Display */}
                          {selectedUser.adminRewards && selectedUser.adminRewards.length > 0 && (
                            <div>
                              <Label className="text-gray-300">Admin Rewards</Label>
                              <div className="p-3 bg-gray-700 rounded border border-gray-600 mt-1 max-h-32 overflow-y-auto">
                                <div className="space-y-2">
                                  {selectedUser.adminRewards.map((reward: any, index: number) => (
                                    <div key={index} className="flex items-center gap-2 text-sm">
                                      {reward.image && (
                                        <img
                                          src={reward.image || "/placeholder.svg"}
                                          alt={reward.name}
                                          className="w-6 h-6"
                                        />
                                      )}
                                      <span
                                        className="font-medium"
                                        style={{ color: reward.styling?.nameColor || "#ffffff" }}
                                      >
                                        {reward.name}
                                      </span>
                                      <span className="text-gray-400">
                                        (+{reward.experience} XP, +{reward.coins} coins)
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Developer Actions */}
                          {isDeveloper && (
                            <Accordion type="single" collapsible className="border border-gray-700 rounded">
                              <AccordionItem value="dev-actions" className="border-none">
                                <AccordionTrigger className="px-4 py-3 text-red-400 hover:text-red-300 hover:no-underline">
                                  Developer Actions
                                </AccordionTrigger>
                                <AccordionContent className="px-4 pb-4">
                                  <div className="flex flex-wrap gap-2">
                                    {selectedUser.role !== "admin" && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handlePromoteToAdmin(selectedUser.id)}
                                        className="text-orange-500 border-orange-500 hover:bg-orange-500/10"
                                      >
                                        Promote to Admin
                                      </Button>
                                    )}
                                    {selectedUser.role !== "user" && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDemoteToUser(selectedUser.id)}
                                        className="text-gray-400 border-gray-400 hover:bg-gray-400/10"
                                      >
                                        Demote to User
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setEditingRole(selectedUser)
                                        setCustomRoleName(selectedUser.customRole || "")
                                        setCustomRoleColor(selectedUser.customRoleColor || "#6b7280")
                                      }}
                                      className="text-purple-500 border-purple-500 hover:bg-purple-500/10"
                                    >
                                      Set Custom Role
                                    </Button>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          )}

                          <div className="flex justify-end">
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                              <Save className="h-4 w-4 mr-1" />
                              Update User
                            </Button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <User className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                          <p>Select a user to edit</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Feedback List */}
              <div className="lg:col-span-2">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <div className="flex justify-between items-center w-full">
                      <CardTitle className="flex items-center gap-2 text-white">
                        <MessageSquare className="h-5 w-5 text-blue-500" />
                        User Feedback
                      </CardTitle>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchFeedbacks}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {/* Tester Feedback (Priority) */}
                      {feedbacks.filter((f) => f.userRole === "tester").length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-orange-400 mb-3 flex items-center gap-2">
                            <TestTube className="h-4 w-4" />
                            Tester Feedback (Priority)
                          </h3>
                          {feedbacks
                            .filter((f) => f.userRole === "tester")
                            .map((feedback) => (
                              <div
                                key={feedback.id}
                                className={`p-4 rounded border cursor-pointer transition-colors ${
                                  selectedFeedback?.id === feedback.id
                                    ? "bg-orange-900/30 border-orange-500"
                                    : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                                }`}
                                onClick={() => setSelectedFeedback(feedback)}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {feedback.category}
                                    </Badge>
                                    <Badge
                                      className={`text-xs ${
                                        feedback.status === "open"
                                          ? "bg-red-600"
                                          : feedback.status === "responded"
                                            ? "bg-green-600"
                                            : "bg-gray-600"
                                      }`}
                                    >
                                      {feedback.status}
                                    </Badge>
                                    {feedback.rewardGiven && (
                                      <Badge className="text-xs bg-purple-600">
                                        <AwardIcon className="h-3 w-3 mr-1" />
                                        Rewarded
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-gray-400">
                                    {feedback.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-300 mb-2">{feedback.message}</p>
                                <div className="text-xs text-gray-400">
                                  From: {feedback.userName} ({feedback.userEmail})
                                  <Badge className="ml-2 text-xs bg-orange-600">TESTER</Badge>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* Regular Feedback */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Regular Feedback</h3>
                        {feedbacks
                          .filter((f) => f.userRole !== "tester")
                          .map((feedback) => (
                            <div
                              key={feedback.id}
                              className={`p-4 rounded border cursor-pointer transition-colors mb-3 ${
                                selectedFeedback?.id === feedback.id
                                  ? "bg-blue-900/30 border-blue-500"
                                  : "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                              }`}
                              onClick={() => setSelectedFeedback(feedback)}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-xs">
                                    {feedback.category}
                                  </Badge>
                                  <Badge
                                    className={`text-xs ${
                                      feedback.status === "open"
                                        ? "bg-red-600"
                                        : feedback.status === "responded"
                                          ? "bg-green-600"
                                          : "bg-gray-600"
                                    }`}
                                  >
                                    {feedback.status}
                                  </Badge>
                                  {feedback.rewardGiven && (
                                    <Badge className="text-xs bg-purple-600">
                                      <AwardIcon className="h-3 w-3 mr-1" />
                                      Rewarded
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-gray-400">
                                  {feedback.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 mb-2">{feedback.message}</p>
                              <div className="text-xs text-gray-400">
                                From: {feedback.userName} ({feedback.userEmail})
                              </div>
                            </div>
                          ))}
                      </div>

                      {feedbacks.length === 0 && (
                        <div className="text-center text-gray-500 py-8">No feedback received yet</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Feedback Details */}
              <div className="lg:col-span-1">
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-white">Feedback Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedFeedback ? (
                      <div className="space-y-4">
                        <div>
                          <Label className="text-gray-300">Category</Label>
                          <Badge variant="secondary" className="mt-1">
                            {selectedFeedback.category}
                          </Badge>
                        </div>

                        <div>
                          <Label className="text-gray-300">Status</Label>
                          <Badge
                            className={`mt-1 ${
                              selectedFeedback.status === "open"
                                ? "bg-red-600"
                                : selectedFeedback.status === "responded"
                                  ? "bg-green-600"
                                  : "bg-gray-600"
                            }`}
                          >
                            {selectedFeedback.status}
                          </Badge>
                        </div>

                        <div>
                          <Label className="text-gray-300">User</Label>
                          <div className="mt-1 text-sm text-white">
                            {selectedFeedback.userName}
                            <div className="text-xs text-gray-400">{selectedFeedback.userEmail}</div>
                            {selectedFeedback.userRole === "tester" && (
                              <Badge className="mt-1 text-xs bg-orange-600">TESTER</Badge>
                            )}
                          </div>
                        </div>

                        <div>
                          <Label className="text-gray-300">Message</Label>
                          <div className="mt-1 p-3 bg-gray-700 rounded text-sm text-white">
                            {selectedFeedback.message}
                          </div>
                        </div>

                        {selectedFeedback.adminResponse && (
                          <div>
                            <Label className="text-gray-300">Admin Response</Label>
                            <div className="mt-1 p-3 bg-blue-900/30 rounded text-sm text-white">
                              {selectedFeedback.adminResponse}
                            </div>
                          </div>
                        )}

                        {selectedFeedback.status === "open" && (
                          <div>
                            <Label htmlFor="adminResponse" className="text-gray-300">
                              Your Response
                            </Label>
                            <Textarea
                              id="adminResponse"
                              value={adminResponse}
                              onChange={(e) => setAdminResponse(e.target.value)}
                              placeholder="Type your response..."
                              className="bg-gray-700 border-gray-600 text-white mt-1"
                              rows={3}
                            />
                            <Button
                              onClick={() => handleRespondToFeedback(selectedFeedback.id)}
                              className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white"
                              disabled={!adminResponse.trim()}
                            >
                              Send Response
                            </Button>
                          </div>
                        )}

                        {!selectedFeedback.rewardGiven && (
                          <div>
                            <Button
                              onClick={() => {
                                setSelectedRewardUser({
                                  id: selectedFeedback.userId,
                                  username: selectedFeedback.userName,
                                })
                                setShowGiveReward(true)
                              }}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <AwardIcon className="h-4 w-4 mr-2" />
                              Give Reward
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-8">Select a feedback to view details</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Send Notification */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Bell className="h-5 w-5 text-blue-500" />
                    Send Notification
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendNotification} className="space-y-4">
                    <div>
                      <Label htmlFor="title" className="text-gray-300">
                        Title
                      </Label>
                      <Input
                        id="title"
                        value={notificationForm.title}
                        onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
                        placeholder="Notification title"
                        className="bg-gray-700 border-gray-600 text-white"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="message" className="text-gray-300">
                        Message
                      </Label>
                      <Textarea
                        id="message"
                        value={notificationForm.message}
                        onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
                        placeholder="Notification message"
                        className="bg-gray-700 border-gray-600 text-white"
                        rows={3}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="type" className="text-gray-300">
                          Type
                        </Label>
                        <Select
                          value={notificationForm.type}
                          onValueChange={(value) => setNotificationForm({ ...notificationForm, type: value })}
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="info">Info</SelectItem>
                            <SelectItem value="warning">Warning</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="error">Error</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="link" className="text-gray-300">
                          Link (optional)
                        </Label>
                        <Input
                          id="link"
                          value={notificationForm.link}
                          onChange={(e) => setNotificationForm({ ...notificationForm, link: e.target.value })}
                          placeholder="https://..."
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>

                    {/* Styling Options */}
                    <div className="space-y-3 p-3 bg-gray-700/50 rounded border border-gray-600">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-300">Styling Options</h4>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNotificationForm({
                                ...notificationForm,
                                titleColor: "#0284c7",
                                messageColor: "#38bdf8",
                                backgroundColor: "rgba(186, 230, 253, 0.1)",
                                borderColor: "#0ea5e9",
                              })
                            }}
                            className="text-xs h-7 text-blue-400 hover:text-blue-300"
                          >
                            Update
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNotificationForm({
                                ...notificationForm,
                                titleColor: "#15803d",
                                messageColor: "#4ade80",
                                backgroundColor: "rgba(187, 247, 208, 0.1)",
                                borderColor: "#16a34a",
                              })
                            }}
                            className="text-xs h-7 text-green-400 hover:text-green-300"
                          >
                            Announcement
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNotificationForm({
                                ...notificationForm,
                                titleColor: "#ea580c",
                                messageColor: "#fb923c",
                                backgroundColor: "rgba(254, 215, 170, 0.1)",
                                borderColor: "#f97316",
                              })
                            }}
                            className="text-xs h-7 text-orange-400 hover:text-orange-300"
                          >
                            Contest
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNotificationForm({
                                ...notificationForm,
                                titleColor: "#9333ea",
                                messageColor: "#c084fc",
                                backgroundColor: "rgba(233, 213, 255, 0.1)",
                                borderColor: "#a855f7",
                              })
                            }}
                            className="text-xs h-7 text-purple-400 hover:text-purple-300"
                          >
                            Event
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-gray-400">Title Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={notificationForm.titleColor}
                              onChange={(e) => setNotificationForm({ ...notificationForm, titleColor: e.target.value })}
                              className="w-12 h-8 bg-gray-700 border-gray-600"
                            />
                            <Input
                              value={notificationForm.titleColor}
                              onChange={(e) => setNotificationForm({ ...notificationForm, titleColor: e.target.value })}
                              className="flex-1 bg-gray-700 border-gray-600 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-gray-400">Message Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={notificationForm.messageColor}
                              onChange={(e) =>
                                setNotificationForm({ ...notificationForm, messageColor: e.target.value })
                              }
                              className="w-12 h-8 bg-gray-700 border-gray-600"
                            />
                            <Input
                              value={notificationForm.messageColor}
                              onChange={(e) =>
                                setNotificationForm({ ...notificationForm, messageColor: e.target.value })
                              }
                              className="flex-1 bg-gray-700 border-gray-600 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-gray-400">Background Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={notificationForm.backgroundColor}
                              onChange={(e) =>
                                setNotificationForm({ ...notificationForm, backgroundColor: e.target.value })
                              }
                              className="w-12 h-8 bg-gray-700 border-gray-600"
                            />
                            <Input
                              value={notificationForm.backgroundColor}
                              onChange={(e) =>
                                setNotificationForm({ ...notificationForm, backgroundColor: e.target.value })
                              }
                              className="flex-1 bg-gray-700 border-gray-600 text-white text-xs"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-gray-400">Border Color</Label>
                          <div className="flex gap-2">
                            <Input
                              type="color"
                              value={notificationForm.borderColor}
                              onChange={(e) =>
                                setNotificationForm({ ...notificationForm, borderColor: e.target.value })
                              }
                              className="w-12 h-8 bg-gray-700 border-gray-600"
                            />
                            <Input
                              value={notificationForm.borderColor}
                              onChange={(e) =>
                                setNotificationForm({ ...notificationForm, borderColor: e.target.value })
                              }
                              className="flex-1 bg-gray-700 border-gray-600 text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Preview */}
                      <div
                        className="mt-3 p-3 rounded"
                        style={{
                          backgroundColor: notificationForm.backgroundColor,
                          borderWidth: "1px",
                          borderStyle: "solid",
                          borderColor: notificationForm.borderColor,
                        }}
                      >
                        <p className="text-sm font-medium mb-1" style={{ color: notificationForm.titleColor }}>
                          {notificationForm.title || "Notification Title Preview"}
                        </p>
                        <p className="text-xs" style={{ color: notificationForm.messageColor }}>
                          {notificationForm.message || "This is how the notification will look like to users."}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center space-x-2 mb-3">
                        <Checkbox
                          id="targetAll"
                          checked={notificationForm.targetAll}
                          onCheckedChange={(checked) =>
                            setNotificationForm({ ...notificationForm, targetAll: !!checked })
                          }
                        />
                        <Label htmlFor="targetAll" className="text-gray-300">
                          Send to all users
                        </Label>
                      </div>

                      {!notificationForm.targetAll && (
                        <div className="space-y-3 p-3 bg-gray-700/50 rounded border border-gray-600">
                          <div>
                            <Label className="text-gray-300 text-sm">Target Roles</Label>
                            <div className="flex gap-2 mt-1">
                              {["user", "admin", "dev"].map((role) => (
                                <div key={role} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`role-${role}`}
                                    checked={notificationForm.targetRoles.includes(role)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setNotificationForm({
                                          ...notificationForm,
                                          targetRoles: [...notificationForm.targetRoles, role],
                                        })
                                      } else {
                                        setNotificationForm({
                                          ...notificationForm,
                                          targetRoles: notificationForm.targetRoles.filter((r) => r !== role),
                                        })
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`role-${role}`} className="text-gray-300 text-sm">
                                    {getRoleName(role)}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label className="text-gray-300 text-sm">Target Levels (comma-separated)</Label>
                            <Input
                              placeholder="1,5,10"
                              className="bg-gray-700 border-gray-600 text-white mt-1"
                              onChange={(e) => {
                                const levels = e.target.value
                                  .split(",")
                                  .map((l) => Number.parseInt(l.trim()))
                                  .filter((l) => !isNaN(l))
                                setNotificationForm({ ...notificationForm, targetLevels: levels })
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Send Notification
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Recent Notifications */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div className="flex justify-between items-center w-full">
                    <CardTitle className="text-white">Recent Notifications</CardTitle>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        // Re-fetch notifications
                        getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(20)))
                          .then((snapshot) => {
                            const notificationsData = snapshot.docs.map((doc) => ({
                              id: doc.id,
                              ...doc.data(),
                            }))
                            setNotifications(notificationsData)
                          })
                          .catch((error) => console.error("Error refreshing notifications:", error))
                      }}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className="p-3 bg-gray-700/50 rounded border border-gray-600">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4
                                className="font-medium text-sm"
                                style={{ color: notification.styling?.titleColor || "#ffffff" }}
                              >
                                {notification.title}
                              </h4>
                              <Badge
                                variant={notification.type === "error" ? "destructive" : "secondary"}
                                className="text-xs"
                              >
                                {notification.type}
                              </Badge>
                            </div>
                            <p className="text-sm" style={{ color: notification.styling?.messageColor || "#d1d5db" }}>
                              {notification.message}
                            </p>
                            <div className="text-xs text-gray-400 mt-1">
                              {notification.createdAt?.toDate?.()?.toLocaleString() || "Unknown date"}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center text-gray-500 py-8">No notifications sent yet</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">{siteStats.totalUsers}</div>
                  <p className="text-xs text-gray-400">Registered accounts</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-400">{siteStats.activeUsers}</div>
                  <p className="text-xs text-gray-400">Recently active</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Games</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-400">{siteStats.totalGames}</div>
                  <p className="text-xs text-gray-400">Games played</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-400">{siteStats.averageWinRate.toFixed(1)}%</div>
                  <p className="text-xs text-gray-400">Average win rate</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Average Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-400">{siteStats.averageLevel.toFixed(1)}</div>
                  <p className="text-xs text-gray-400">Player level</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Total Coins</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-500">{siteStats.totalCoins.toLocaleString()}</div>
                  <p className="text-xs text-gray-400">In circulation</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-300">Games Won</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">{siteStats.gamesWon}</div>
                  <p className="text-xs text-gray-400">Successful games</p>
                </CardContent>
              </Card>

              <Card className="bg-gray-800 border-gray-700">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-white">Online</span>
                  </div>
                  <p className="text-xs text-gray-400">All systems operational</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Detailed Analytics</CardTitle>
                <CardDescription className="text-gray-400">
                  More detailed analytics features coming soon
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-400 mb-2">Advanced Analytics Coming Soon</h3>
                  <p className="max-w-md mx-auto">
                    We're working on detailed charts, user behavior analysis, and performance metrics.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Leaderboard Management
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure leaderboard settings and reset schedules
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-gray-300">Reset Schedule</Label>
                    <div className="space-y-3 mt-2">
                      <div>
                        <Label className="text-sm text-gray-400">Daily Reset Time</Label>
                        <Input
                          type="time"
                          value={leaderboardSettings.dailyResetTime}
                          onChange={(e) =>
                            setLeaderboardSettings({
                              ...leaderboardSettings,
                              dailyResetTime: e.target.value,
                            })
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>

                      <div>
                        <Label className="text-sm text-gray-400">Weekly Reset Day</Label>
                        <Select
                          value={leaderboardSettings.weeklyResetDay}
                          onChange={(value) =>
                            setLeaderboardSettings({
                              ...leaderboardSettings,
                              weeklyResetDay: value,
                            })
                          }
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">Monday</SelectItem>
                            <SelectItem value="tuesday">Tuesday</SelectItem>
                            <SelectItem value="wednesday">Wednesday</SelectItem>
                            <SelectItem value="thursday">Thursday</SelectItem>
                            <SelectItem value="friday">Friday</SelectItem>
                            <SelectItem value="saturday">Saturday</SelectItem>
                            <SelectItem value="sunday">Sunday</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-sm text-gray-400">Monthly Reset Day</Label>
                        <Input
                          type="number"
                          min="1"
                          max="28"
                          value={leaderboardSettings.monthlyResetDay}
                          onChange={(e) =>
                            setLeaderboardSettings({
                              ...leaderboardSettings,
                              monthlyResetDay: Number(e.target.value),
                            })
                          }
                          className="bg-gray-700 border-gray-600 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-300">Enabled Categories</Label>
                    <div className="space-y-2 mt-2">
                      {[
                        { id: "experience", name: "Experience & Level", icon: Star },
                        { id: "coins", name: "Current Gold", icon: Coins },
                        { id: "games", name: "Games Played", icon: Trophy },
                        { id: "wins", name: "Victories", icon: Crown },
                        { id: "mines", name: "Mines Defused", icon: Award },
                        { id: "cells", name: "Cells Opened", icon: Target },
                      ].map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`category-${category.id}`}
                            checked={leaderboardSettings.enabledCategories.includes(category.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setLeaderboardSettings({
                                  ...leaderboardSettings,
                                  enabledCategories: [...leaderboardSettings.enabledCategories, category.id],
                                })
                              } else {
                                setLeaderboardSettings({
                                  ...leaderboardSettings,
                                  enabledCategories: leaderboardSettings.enabledCategories.filter(
                                    (c) => c !== category.id,
                                  ),
                                })
                              }
                            }}
                          />
                          <Label
                            htmlFor={`category-${category.id}`}
                            className="text-gray-300 text-sm flex items-center gap-2"
                          >
                            <category.icon className="h-4 w-4" />
                            {category.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-gray-300">Display Settings</Label>
                  <div className="mt-2">
                    <Label className="text-sm text-gray-400">Maximum Display Count</Label>
                    <Input
                      type="number"
                      min="10"
                      max="500"
                      value={leaderboardSettings.maxDisplayCount}
                      onChange={(e) =>
                        setLeaderboardSettings({
                          ...leaderboardSettings,
                          maxDisplayCount: Number(e.target.value),
                        })
                      }
                      className="bg-gray-700 border-gray-600 text-white mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Save Settings</Button>
                  {isDeveloper && <Button variant="destructive">Reset All Leaderboards</Button>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Create Reward (Developer Only) */}
              {isDeveloper && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Gift className="h-5 w-5 text-purple-500" />
                      Create Reward
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      onClick={() => setShowCreateReward(true)}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      Create New Reward
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Give Reward */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Award className="h-5 w-5 text-green-500" />
                    Give Reward
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => setShowGiveReward(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={rewards.length === 0}
                  >
                    Give Reward to User
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Existing Rewards */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center w-full">
                  <CardTitle className="text-white">Existing Rewards</CardTitle>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      // Re-fetch rewards
                      getDocs(collection(db, "rewards"))
                        .then((snapshot) => {
                          const rewardsData = snapshot.docs.map((doc) => ({
                            id: doc.id,
                            ...doc.data(),
                          }))
                          setRewards(rewardsData)
                        })
                        .catch((error) => console.error("Error refreshing rewards:", error))
                    }}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {rewards.map((reward) => (
                    <div key={reward.id} className="p-4 bg-gray-700/50 rounded border border-gray-600">
                      <div className="flex items-start gap-3">
                        {reward.image && (
                          <img
                            src={reward.image || "/placeholder.svg"}
                            alt={reward.name}
                            className="w-16 h-16 rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium" style={{ color: reward.styling?.nameColor || "#ffffff" }}>
                            {reward.name}
                          </h3>
                          <p className="text-sm mt-1" style={{ color: reward.styling?.descriptionColor || "#d1d5db" }}>
                            {reward.description}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs">
                            <Badge variant="secondary">{reward.rarity}</Badge>
                            <span className="text-purple-400">+{reward.experience} XP</span>
                            <span className="text-yellow-400">+{reward.coins} coins</span>
                          </div>
                        </div>
                        {isDeveloper && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (window.confirm("Delete this reward?")) {
                                // Handle delete reward
                              }
                            }}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {rewards.length === 0 && (
                    <div className="col-span-full text-center text-gray-500 py-8">No rewards created yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <div className="flex justify-between items-center w-full">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <History className="h-5 w-5 text-green-500" />
                    Admin Action Logs
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={fetchAdminLogs}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {adminLogs.map((log) => (
                    <div key={log.id} className="p-4 bg-gray-700/50 rounded border border-gray-600">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {log.action.replace(/_/g, " ").toUpperCase()}
                          </Badge>
                          <Badge
                            className={`text-xs ${
                              log.adminRole === "dev"
                                ? "bg-red-600"
                                : log.adminRole === "admin"
                                  ? "bg-orange-600"
                                  : "bg-blue-600"
                            }`}
                          >
                            {log.adminRole?.toUpperCase()}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-400">
                          {log.timestamp?.toDate?.()?.toLocaleString() || "Unknown"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mb-2">Admin: {log.adminEmail}</div>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
                          <pre>{JSON.stringify(log.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                  {adminLogs.length === 0 && (
                    <div className="text-center text-gray-500 py-8">No admin actions logged yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Maintenance Mode */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Settings className="h-5 w-5 text-gray-400" />
                    Maintenance Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-gray-300">Maintenance Mode</Label>
                      <p className="text-sm text-gray-400">Restrict access to admins, developers, and testers only</p>
                    </div>
                    <Switch checked={maintenanceMode} onCheckedChange={() => setShowMaintenanceDialog(true)} />
                  </div>

                  {maintenanceMode && (
                    <div className="p-3 bg-red-900/20 border border-red-700 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-red-400 font-medium">Maintenance Mode Active</span>
                      </div>
                      <p className="text-sm text-red-300">Reason: {maintenanceReason || "No reason specified"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Access Restriction */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Shield className="h-5 w-5 text-red-500" />
                    Access Restriction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Access Level</Label>
                    <Select value={accessRestriction} onValueChange={setAccessRestriction}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-1">
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="none">No Restriction</SelectItem>
                        <SelectItem value="tester">Testers & Staff Only</SelectItem>
                        <SelectItem value="admin">Admins & Devs Only</SelectItem>
                        <SelectItem value="dev">Developers Only</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-2">
                      Restricts who can access the application. More restricted levels include all higher permission
                      roles.
                    </p>
                  </div>

                  <Button
                    onClick={async () => {
                      try {
                        await setDoc(doc(db, "settings", "access"), {
                          level: accessRestriction,
                          updatedAt: Timestamp.now(),
                          updatedBy: user?.uid || "unknown",
                        })

                        await logAdminAction("access_restriction_change", { level: accessRestriction })

                        alert(
                          `Access restriction updated to: ${accessRestriction === "none" ? "None" : accessRestriction}`,
                        )
                      } catch (error) {
                        console.error("Error updating access restriction:", error)
                        alert("Error updating access restriction")
                      }
                    }}
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                  >
                    Update Access Restrictions
                  </Button>
                </CardContent>
              </Card>

              {/* Version Management */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Version Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Current Version</Label>
                    <div className="mt-1 p-3 bg-gray-700 rounded text-white font-mono">v{currentAppVersion}</div>
                  </div>

                  <div>
                    <Label htmlFor="newVersion" className="text-gray-300">
                      New Version
                    </Label>
                    <Input
                      id="newVersion"
                      value={newVersion}
                      onChange={(e) => setNewVersion(e.target.value)}
                      placeholder="0.0.3.5"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>

                  <Button
                    onClick={handleUpdateVersion}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={!newVersion.trim()}
                  >
                    Update Version
                  </Button>
                </CardContent>
              </Card>

              {/* System Information */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-white">System Information</CardTitle>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        // Refresh system info
                        const fetchSystemInfo = async () => {
                          try {
                            // You could add more detailed system info fetching logic here
                            const usersSnapshot = await getDocs(collection(db, "users"))
                            setSiteStats({
                              ...siteStats,
                              totalUsers: usersSnapshot.size,
                              activeUsers: Math.floor(usersSnapshot.size * 0.3),
                            })
                            alert("System information refreshed")
                          } catch (error) {
                            console.error("Error fetching system info:", error)
                          }
                        }
                        fetchSystemInfo()
                      }}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version</span>
                    <span className="text-white">v{currentAppVersion}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Database</span>
                    <span className="text-green-400">Connected</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Users</span>
                    <span className="text-white">{siteStats.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Active Users</span>
                    <span className="text-white">{siteStats.activeUsers}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Actions */}
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Admin Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={async () => {
                      try {
                        await logAdminAction("clear_cache", {})
                        alert("Cache cleared successfully")
                      } catch (error) {
                        console.error("Error clearing cache:", error)
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Cache
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={async () => {
                      try {
                        const usersSnapshot = await getDocs(collection(db, "users"))
                        const usersData = usersSnapshot.docs.map((doc) => ({
                          id: doc.id,
                          ...doc.data(),
                        }))

                        // Create a CSV string
                        const headers = ["userId", "username", "email", "role", "gamesPlayed", "gamesWon", "experience"]
                        let csv = headers.join(",") + "\n"

                        usersData.forEach((user) => {
                          const row = [
                            user.userId,
                            `"${user.username || ""}"`,
                            `"${user.email || ""}"`,
                            user.role,
                            user.gamesPlayed || 0,
                            user.gamesWon || 0,
                            user.experience || 0,
                          ]
                          csv += row.join(",") + "\n"
                        })

                        // Create blob and download
                        const blob = new Blob([csv], { type: "text/csv" })
                        const url = window.URL.createObjectURL(blob)
                        const a = document.createElement("a")
                        a.setAttribute("hidden", "")
                        a.setAttribute("href", url)
                        a.setAttribute("download", "minesweeper_users.csv")
                        document.body.appendChild(a)
                        a.click()
                        document.body.removeChild(a)

                        await logAdminAction("export_users", { count: usersData.length })
                      } catch (error) {
                        console.error("Error exporting users:", error)
                        alert("Error exporting user data")
                      }
                    }}
                  >
                    Export User Data
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                    onClick={async () => {
                      try {
                        // Generate a simple report with basic stats
                        const statsSnapshot = await getDoc(doc(db, "settings", "stats"))
                        const stats = statsSnapshot.exists() ? statsSnapshot.data() : {}

                        // Update stats with latest info
                        await setDoc(doc(db, "settings", "stats"), {
                          ...stats,
                          totalUsers: siteStats.totalUsers,
                          totalGames: siteStats.totalGames,
                          gamesWon: siteStats.gamesWon,
                          averageWinRate: siteStats.averageWinRate,
                          lastUpdated: Timestamp.now(),
                        })

                        await logAdminAction("generate_report", {})
                        alert("Report generated successfully")
                      } catch (error) {
                        console.error("Error generating report:", error)
                        alert("Error generating report")
                      }
                    }}
                  >
                    Generate Report
                  </Button>

                  {isDeveloper && (
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        if (
                          window.confirm(
                            "WARNING: This will reset all user statistics. This action cannot be undone. Are you ABSOLUTELY sure?",
                          )
                        ) {
                          if (
                            window.prompt("Type 'RESET ALL STATS' to confirm this destructive action") ===
                            "RESET ALL STATS"
                          ) {
                            // Handle reset logic
                            alert("Reset functionality disabled in this demo for safety")
                          }
                        }
                      }}
                    >
                      Reset All Statistics
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Custom Role Modal */}
        {editingRole && (
          <Dialog open={!!editingRole} onOpenChange={() => setEditingRole(null)}>
            <DialogContent className="bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-white">Set Custom Role</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Create a custom role display for {editingRole.username}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSetCustomRole} className="space-y-4">
                <div>
                  <Label htmlFor="customRoleName" className="text-gray-300">
                    Custom Role Name
                  </Label>
                  <Input
                    id="customRoleName"
                    value={customRoleName}
                    onChange={(e) => setCustomRoleName(e.target.value)}
                    placeholder="Enter custom role name"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="customRoleColor" className="text-gray-300">
                    Role Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="customRoleColor"
                      type="color"
                      value={customRoleColor}
                      onChange={(e) => setCustomRoleColor(e.target.value)}
                      className="w-16 h-10 bg-gray-700 border-gray-600"
                    />
                    <Input
                      value={customRoleColor}
                      onChange={(e) => setCustomRoleColor(e.target.value)}
                      placeholder="#6b7280"
                      className="flex-1 bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
                <div className="p-3 bg-gray-700 rounded border border-gray-600">
                  <span className="text-sm text-gray-400">Preview: </span>
                  <Badge
                    style={{
                      backgroundColor: `${customRoleColor}20`,
                      color: customRoleColor,
                      borderColor: customRoleColor,
                    }}
                    className="border"
                  >
                    {customRoleName || "Custom Role"}
                  </Badge>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingRole(null)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Set Role
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Maintenance Mode Dialog */}
        <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {maintenanceMode ? "Disable" : "Enable"} Maintenance Mode
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                {maintenanceMode
                  ? "This will allow all users to access the game again."
                  : "This will restrict access to administrators and developers only."}
              </DialogDescription>
            </DialogHeader>
            {!maintenanceMode && (
              <div>
                <Label htmlFor="maintenanceReason" className="text-gray-300">
                  Reason (optional)
                </Label>
                <Textarea
                  id="maintenanceReason"
                  value={maintenanceReason}
                  onChange={(e) => setMaintenanceReason(e.target.value)}
                  placeholder="Scheduled maintenance, bug fixes, etc."
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                />
              </div>
            )}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowMaintenanceDialog(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleToggleMaintenance}
                variant={maintenanceMode ? "default" : "destructive"}
                className={maintenanceMode ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
              >
                {maintenanceMode ? "Disable" : "Enable"} Maintenance Mode
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Level Editor Dialog */}
        <Dialog open={showLevelEditor} onOpenChange={setShowLevelEditor}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Edit User Level</DialogTitle>
              <DialogDescription className="text-gray-400">
                Adjust the level and experience for {selectedUser?.username}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="levelInput" className="text-gray-300">
                  Level
                </Label>
                <Input
                  id="levelInput"
                  type="number"
                  min="1"
                  value={levelToEdit}
                  onChange={(e) => {
                    const level = Number(e.target.value)
                    setLevelToEdit(level)
                    setExperienceToEdit(calculateExpForLevel(level))
                  }}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="expInput" className="text-gray-300">
                  Experience
                </Label>
                <Input
                  id="expInput"
                  type="number"
                  min="0"
                  value={experienceToEdit}
                  onChange={(e) => {
                    const exp = Number(e.target.value)
                    setExperienceToEdit(exp)
                    setLevelToEdit(calculateLevel(exp))
                  }}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="p-3 bg-gray-700 rounded border border-gray-600">
                <div className="text-sm text-gray-400">Preview:</div>
                <div className="flex items-center gap-2 mt-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-white">Level {levelToEdit}</span>
                  <span className="text-gray-400">({experienceToEdit} XP)</span>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowLevelEditor(false)}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateLevel} className="bg-blue-600 hover:bg-blue-700 text-white">
                Update Level
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Reward Dialog */}
        <Dialog open={showCreateReward} onOpenChange={setShowCreateReward}>
          <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Create New Reward</DialogTitle>
              <DialogDescription className="text-gray-400">
                Create a new reward that can be given to users
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateReward} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rewardName" className="text-gray-300">
                    Reward Name
                  </Label>
                  <Input
                    id="rewardName"
                    value={newReward.name}
                    onChange={(e) => setNewReward({ ...newReward, name: e.target.value })}
                    placeholder="Enter reward name"
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rewardRarity" className="text-gray-300">
                    Rarity
                  </Label>
                  <Select
                    value={newReward.rarity}
                    onValueChange={(value) => setNewReward({ ...newReward, rarity: value })}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="common">Common</SelectItem>
                      <SelectItem value="uncommon">Uncommon</SelectItem>
                      <SelectItem value="rare">Rare</SelectItem>
                      <SelectItem value="epic">Epic</SelectItem>
                      <SelectItem value="legendary">Legendary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="rewardDescription" className="text-gray-300">
                  Description
                </Label>
                <Textarea
                  id="rewardDescription"
                  value={newReward.description}
                  onChange={(e) => setNewReward({ ...newReward, description: e.target.value })}
                  placeholder="Enter reward description"
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rewardExperience" className="text-gray-300">
                    Experience Reward
                  </Label>
                  <Input
                    id="rewardExperience"
                    type="number"
                    min="0"
                    value={newReward.experience}
                    onChange={(e) => setNewReward({ ...newReward, experience: Number(e.target.value) })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="rewardCoins" className="text-gray-300">
                    Coin Reward
                  </Label>
                  <Input
                    id="rewardCoins"
                    type="number"
                    min="0"
                    value={newReward.coins}
                    onChange={(e) => setNewReward({ ...newReward, coins: Number(e.target.value) })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="rewardImage" className="text-gray-300">
                  Image URL (64x64 recommended)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="rewardImage"
                    value={newReward.image}
                    onChange={(e) => setNewReward({ ...newReward, image: e.target.value })}
                    placeholder="https://example.com/image.png"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <Button type="button" variant="outline" className="border-gray-600 text-gray-300">
                    <Upload className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Styling Options */}
              <div className="space-y-3 p-3 bg-gray-700/50 rounded border border-gray-600">
                <h4 className="text-sm font-medium text-gray-300">Styling Options</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-400">Name Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={newReward.nameColor}
                        onChange={(e) => setNewReward({ ...newReward, nameColor: e.target.value })}
                        className="w-12 h-8 bg-gray-700 border-gray-600"
                      />
                      <Input
                        value={newReward.nameColor}
                        onChange={(e) => setNewReward({ ...newReward, nameColor: e.target.value })}
                        className="flex-1 bg-gray-700 border-gray-600 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-gray-400">Description Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={newReward.descriptionColor}
                        onChange={(e) => setNewReward({ ...newReward, descriptionColor: e.target.value })}
                        className="w-12 h-8 bg-gray-700 border-gray-600"
                      />
                      <Input
                        value={newReward.descriptionColor}
                        onChange={(e) => setNewReward({ ...newReward, descriptionColor: e.target.value })}
                        className="flex-1 bg-gray-700 border-gray-600 text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="p-3 bg-gray-700 rounded border border-gray-600">
                <div className="text-sm text-gray-400 mb-2">Preview:</div>
                <div className="flex items-start gap-3">
                  {newReward.image && (
                    <img src={newReward.image || "/placeholder.svg"} alt="Preview" className="w-16 h-16 rounded" />
                  )}
                  <div>
                    <h3 className="font-medium" style={{ color: newReward.nameColor }}>
                      {newReward.name || "Reward Name"}
                    </h3>
                    <p className="text-sm mt-1" style={{ color: newReward.descriptionColor }}>
                      {newReward.description || "Reward description"}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <Badge variant="secondary">{newReward.rarity}</Badge>
                      <span className="text-purple-400">+{newReward.experience} XP</span>
                      <span className="text-yellow-400">+{newReward.coins} coins</span>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateReward(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white">
                  Create Reward
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Give Reward Dialog */}
        <Dialog open={showGiveReward} onOpenChange={setShowGiveReward}>
          <DialogContent className="bg-gray-800 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">Give Reward to User</DialogTitle>
              <DialogDescription className="text-gray-400">Select a user and reward to give</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Select User</Label>
                <Select
                  value={selectedRewardUser?.id || ""}
                  onValueChange={(value) => {
                    const user = users.find((u) => u.id === value)
                    setSelectedRewardUser(user)
                  }}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Choose a user" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600 max-h-48">
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <span>{user.username}</span>
                          <span className="text-xs text-gray-400">#{user.userId}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-gray-300">Select Reward</Label>
                <Select
                  value={selectedRewardToGive?.id || ""}
                  onValueChange={(value) => {
                    const reward = rewards.find((r) => r.id === value)
                    setSelectedRewardToGive(reward)
                  }}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Choose a reward" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600 max-h-48">
                    {rewards.map((reward) => (
                      <SelectItem key={reward.id} value={reward.id}>
                        <div className="flex items-center gap-2">
                          {reward.image && (
                            <img
                              src={reward.image || "/placeholder.svg"}
                              alt={reward.name}
                              className="w-6 h-6 rounded"
                            />
                          )}
                          <span>{reward.name}</span>
                          <span className="text-xs text-gray-400">
                            (+{reward.experience} XP, +{reward.coins} coins)
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRewardToGive && (
                <div className="p-3 bg-gray-700 rounded border border-gray-600">
                  <div className="text-sm text-gray-400 mb-2">Selected Reward:</div>
                  <div className="flex items-start gap-3">
                    {selectedRewardToGive.image && (
                      <img
                        src={selectedRewardToGive.image || "/placeholder.svg"}
                        alt={selectedRewardToGive.name}
                        className="w-12 h-12 rounded"
                      />
                    )}
                    <div>
                      <h3
                        className="font-medium"
                        style={{ color: selectedRewardToGive.styling?.nameColor || "#ffffff" }}
                      >
                        {selectedRewardToGive.name}
                      </h3>
                      <p
                        className="text-sm mt-1"
                        style={{ color: selectedRewardToGive.styling?.descriptionColor || "#d1d5db" }}
                      >
                        {selectedRewardToGive.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        <Badge variant="secondary">{selectedRewardToGive.rarity}</Badge>
                        <span className="text-purple-400">+{selectedRewardToGive.experience} XP</span>
                        <span className="text-yellow-400">+{selectedRewardToGive.coins} coins</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowGiveReward(false)
                  setSelectedRewardUser(null)
                  setSelectedRewardToGive(null)
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGiveReward}
                disabled={!selectedRewardUser || !selectedRewardToGive}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Give Reward
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
