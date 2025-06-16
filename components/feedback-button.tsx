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

interface FeedbackButtonProps {
  userRole?: string
}

export function FeedbackButton({ userRole }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
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
      setIsOpen(false)
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
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="fixed bottom-4 left-4 z-40 bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Feedback
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <Card className="w-80 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-bold text-gray-800 dark:text-white">Send Feedback</CardTitle>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="category" className="text-gray-700 dark:text-gray-300">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="improvement">Improvement</SelectItem>
                  <SelectItem value="ui">UI/UX Issue</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="feedback" className="text-gray-700 dark:text-gray-300">
                Your Feedback
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Describe your issue, suggestion, or feedback..."
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
                onClick={() => setIsOpen(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
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
                Send
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
