"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MessageSquare, X, Send } from "lucide-react"
import { auth, db } from "@/lib/firebase"
import { collection, addDoc, Timestamp } from "firebase/firestore"
import { useTranslation } from "@/lib/i18n/LanguageContext"

interface FeedbackButtonProps {
  userRole?: string
  isOpen?: boolean
  onOpen?: () => void
  onClose?: () => void
}

export function FeedbackButton({ userRole, isOpen: externalIsOpen, onOpen, onClose }: FeedbackButtonProps) {
  const { t } = useTranslation()
  const [internalOpen, setInternalOpen] = useState(false)
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen

  const [feedback, setFeedback] = useState("")
  const [category, setCategory] = useState("bug")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!feedback.trim() || !auth.currentUser) return

    setIsSubmitting(true)
    try {
      await addDoc(collection(db, "feedback"), {
        message: feedback,
        category,
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        userName: auth.currentUser.displayName || "Unknown",
        userRole: userRole || "user",
        status: "open",
        priority: userRole === "tester" ? "high" : "normal",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        adminResponse: null,
        rewardGiven: false,
      })

      setFeedback("")
      setCategory("bug")
      if (onClose) onClose();
      setInternalOpen(false)
      alert("Feedback submitted successfully! Thank you for your input.")
    } catch (error) {
      console.error("Error submitting feedback:", error)
      alert("Error submitting feedback. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => {
          if (onOpen) onOpen();
          setInternalOpen(true)
        }}
        variant="outline"
        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 hover:bg-gray-800 transition-colors border border-gray-800 shadow-lg"
        title={t("feedback.title")}
      >
        <MessageSquare className="h-5 w-5 text-gray-200" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className="w-80 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">{t("feedback.title")}</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => { if (onClose) onClose(); setInternalOpen(false) }} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category" className="text-gray-700 dark:text-gray-300">
                {t("feedback.category")}
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">{t("feedback.bug")}</SelectItem>
                  <SelectItem value="feature">{t("feedback.feature")}</SelectItem>
                  <SelectItem value="improvement">{t("feedback.improvement")}</SelectItem>
                  <SelectItem value="ui">{t("feedback.ui")}</SelectItem>
                  <SelectItem value="performance">{t("feedback.performance")}</SelectItem>
                  <SelectItem value="other">{t("feedback.other")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="feedback" className="text-gray-700 dark:text-gray-300">
                {t("feedback.yourFeedback")}
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={t("feedback.placeholder")}
                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200"
                rows={4}
                required
              />
            </div>

            {userRole === "tester" && (
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  ⭐ As a tester, your feedback will be prioritized and may be eligible for rewards!
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { if (onClose) onClose(); setInternalOpen(false) }}
                className="flex-1"
                disabled={isSubmitting}
              >
                {t("feedback.cancel")}
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                disabled={isSubmitting || !feedback.trim()}
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {t("feedback.send")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
