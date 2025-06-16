"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { auth, db } from "@/lib/firebase"
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, type Timestamp } from "firebase/firestore"

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "warning" | "success" | "error"
  createdAt: Timestamp
  read: boolean
  link?: string
  targetUsers?: string[]
  targetRoles?: string[]
  targetLevels?: number[]
  styling?: {
    titleColor: string
    messageColor: string
    backgroundColor: string
    borderColor: string
  }
}

export function NotificationsButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const notificationsRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!auth.currentUser) return

      setLoading(true)
      try {
        // Get user data to check role and level
        const userDoc = await getDocs(query(collection(db, "users"), where("email", "==", auth.currentUser.email)))

        if (userDoc.empty) {
          setLoading(false)
          return
        }

        const userData = userDoc.docs[0].data()
        const userRole = userData.role || "user"
        const userLevel = Math.floor(Math.sqrt(userData.experience / 100)) + 1

        // Get global notifications and notifications targeted to this user
        const notificationsQuery = query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(10))

        const notificationsSnapshot = await getDocs(notificationsQuery)
        const notificationsData = notificationsSnapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as Notification)
          .filter((notification) => {
            // Check if notification is targeted to specific users
            if (notification.targetUsers && notification.targetUsers.length > 0) {
              return notification.targetUsers.includes(auth.currentUser!.uid)
            }

            // Check if notification is targeted to specific roles
            if (notification.targetRoles && notification.targetRoles.length > 0) {
              return notification.targetRoles.includes(userRole)
            }

            // Check if notification is targeted to specific levels
            if (notification.targetLevels && notification.targetLevels.length > 0) {
              return notification.targetLevels.includes(userLevel)
            }

            // If no targeting, it's a global notification
            return true
          })

        setNotifications(notificationsData)
        setUnreadCount(notificationsData.filter((n) => !n.read).length)
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    if (auth.currentUser) {
      fetchNotifications()
    }

    // Set up interval to check for new notifications
    const interval = setInterval(() => {
      if (auth.currentUser) {
        fetchNotifications()
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Handle clicks outside of the notifications panel to close it
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const markAsRead = async (notificationId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notificationId), {
        read: true,
      })

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((n) => !n.read)

      // Update each unread notification
      await Promise.all(unreadNotifications.map((n) => updateDoc(doc(db, "notifications", n.id), { read: true })))

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const handleOpenLink = (link?: string) => {
    if (link) {
      window.open(link, "_blank")
    }
  }

  const getNotificationBackgroundStyle = (notification: Notification) => {
    if (notification.styling) {
      return {
        backgroundColor:
          notification.styling.backgroundColor || (notification.read ? "transparent" : "rgba(59, 130, 246, 0.1)"),
        borderColor: notification.styling.borderColor || "transparent",
      }
    }
    return {
      backgroundColor: notification.read ? "transparent" : "rgba(59, 130, 246, 0.1)",
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "info":
        return "bg-blue-500"
      case "warning":
        return "bg-yellow-500"
      case "success":
        return "bg-green-500"
      case "error":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate()
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? "s" : ""} ago`
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="relative" ref={buttonRef}>
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <Card
          className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[70vh] overflow-hidden z-50 shadow-xl border-gray-200 dark:border-gray-700"
          ref={notificationsRef}
        >
          <div className="p-3 border-b border-gray-200 dark:border-gray-600 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
            <h3 className="font-medium">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs h-7">
                  Mark all as read
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[calc(70vh-48px)] overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-800 dark:border-white mx-auto"></div>
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 transition-colors ${!notification.read ? "border-l-4 border-blue-500 dark:border-blue-400" : ""}`}
                    style={getNotificationBackgroundStyle(notification)}
                    onClick={() => {
                      if (!notification.read) markAsRead(notification.id)
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${getTypeColor(notification.type)}`}></div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4
                            className="font-medium text-sm"
                            style={{ color: notification.styling?.titleColor || "inherit" }}
                          >
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-500">{formatDate(notification.createdAt)}</span>
                        </div>
                        <p className="text-sm mt-1" style={{ color: notification.styling?.messageColor || "inherit" }}>
                          {notification.message}
                        </p>
                        {notification.link && (
                          <div className="mt-1">
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenLink(notification.link)
                              }}
                            >
                              View details
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                <p>No notifications</p>
                <p className="text-xs mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
