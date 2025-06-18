"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { X, Settings, AlertTriangle } from "lucide-react"

interface GameSettings {
  width: number
  height: number
  totalMines: number
  chunkMines: number
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  currentSettings: GameSettings
  tempSettings: GameSettings
  setTempSettings: (settings: GameSettings) => void
  onApplySettings: () => void
}

// Standard difficulty presets
const STANDARD_PRESETS = [
  { name: "Easy", width: 9, height: 9, totalMines: 10 },
  { name: "Medium", width: 16, height: 16, totalMines: 40 },
  { name: "Hard", width: 30, height: 16, totalMines: 99 },
  { name: "Expert", width: 24, height: 24, totalMines: 150 },
]

export function SettingsModal({
  isOpen,
  onClose,
  currentSettings,
  tempSettings,
  setTempSettings,
  onApplySettings,
}: SettingsModalProps) {
  const [hasChanges, setHasChanges] = useState(false)
  const [panicLink, setPanicLink] = useState<string>("")

  // Check if settings have changed
  useEffect(() => {
    const changed =
      tempSettings.width !== currentSettings.width ||
      tempSettings.height !== currentSettings.height ||
      tempSettings.totalMines !== currentSettings.totalMines
    setHasChanges(changed)
  }, [tempSettings, currentSettings])

  // Check if settings match a standard preset
  const isStandardPreset = (settings: GameSettings) => {
    return STANDARD_PRESETS.some(
      (preset) =>
        preset.width === settings.width &&
        preset.height === settings.height &&
        preset.totalMines === settings.totalMines,
    )
  }

  // Calculate difficulty percentage
  const getDifficulty = (settings: GameSettings) => {
    const totalCells = settings.width * settings.height
    const difficulty = (settings.totalMines / totalCells) * 100
    return Math.round(difficulty)
  }

  // Get difficulty level name
  const getDifficultyLevel = (percentage: number) => {
    if (percentage <= 12) return "Easy"
    if (percentage <= 18) return "Medium"
    if (percentage <= 25) return "Hard"
    return "Expert"
  }

  // Get difficulty color
  const getDifficultyColor = (percentage: number) => {
    if (percentage <= 12) return "text-green-500"
    if (percentage <= 18) return "text-yellow-500"
    if (percentage <= 25) return "text-orange-500"
    return "text-red-500"
  }

  const handleApply = () => {
    onApplySettings()
    // Don't close the modal, just apply settings
  }

  const handleClose = () => {
    // Reset to current settings if there are unsaved changes
    if (hasChanges) {
      setTempSettings(currentSettings)
    }
    onClose()
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPanicLink(localStorage.getItem("minesweeper_panic_link") || "")
    }
  }, [isOpen])

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("minesweeper_panic_link", panicLink)
    }
  }, [panicLink])

  if (!isOpen) return null

  const difficulty = getDifficulty(tempSettings)
  const difficultyLevel = getDifficultyLevel(difficulty)
  const difficultyColor = getDifficultyColor(difficulty)
  const isStandard = isStandardPreset(tempSettings)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Game Settings
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Game field settings */}
          <div className="mb-8 pb-8 border-b border-gray-200 dark:border-gray-700 space-y-6">
            <div>
              <Label className={`${hasChanges ? "text-yellow-500" : "text-gray-800 dark:text-gray-200"}`}>
                Width: {tempSettings.width}
              </Label>
              <Slider
                value={[tempSettings.width]}
                onValueChange={([value]) =>
                  setTempSettings({
                    ...tempSettings,
                    width: value,
                    totalMines: Math.min(tempSettings.totalMines, Math.floor(value * tempSettings.height * 0.3)),
                  })
                }
                min={8}
                max={32}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className={`${hasChanges ? "text-yellow-500" : "text-gray-800 dark:text-gray-200"}`}>
                Height: {tempSettings.height}
              </Label>
              <Slider
                value={[tempSettings.height]}
                onValueChange={([value]) =>
                  setTempSettings({
                    ...tempSettings,
                    height: value,
                    totalMines: Math.min(tempSettings.totalMines, Math.floor(tempSettings.width * value * 0.3)),
                  })
                }
                min={8}
                max={32}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className={`${hasChanges ? "text-yellow-500" : "text-gray-800 dark:text-gray-200"}`}>
                Total Mines: {tempSettings.totalMines}
              </Label>
              <Slider
                value={[tempSettings.totalMines]}
                onValueChange={([value]) =>
                  setTempSettings({
                    ...tempSettings,
                    totalMines: value,
                  })
                }
                min={1}
                max={Math.floor(tempSettings.width * tempSettings.height * 0.3)}
                step={1}
                className="mt-2"
              />
            </div>

            {/* Difficulty Display */}
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Difficulty</span>
                <span className={`text-lg font-bold ${difficultyColor}`}>{difficulty}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${difficultyColor}`}>{difficultyLevel}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {tempSettings.totalMines} mines / {tempSettings.width * tempSettings.height} cells
                </span>
              </div>
            </div>

            {/* Statistics Warning */}
            {!isStandard && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">Custom Settings</p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Statistics will not be tracked for custom difficulty settings. Use standard presets to compete on
                      leaderboards.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Preset Buttons */}
            <div className="space-y-2">
              <Label className="text-gray-800 dark:text-gray-200">Quick Presets</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTempSettings({
                      width: 9,
                      height: 9,
                      totalMines: 10,
                      chunkMines: 8,
                    })
                  }
                  className="text-xs"
                >
                  Easy (9×9)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTempSettings({
                      width: 16,
                      height: 16,
                      totalMines: 40,
                      chunkMines: 8,
                    })
                  }
                  className="text-xs"
                >
                  Medium (16×16)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTempSettings({
                      width: 30,
                      height: 16,
                      totalMines: 99,
                      chunkMines: 8,
                    })
                  }
                  className="text-xs"
                >
                  Hard (30×16)
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setTempSettings({
                      width: 24,
                      height: 24,
                      totalMines: 150,
                      chunkMines: 8,
                    })
                  }
                  className="text-xs"
                >
                  Expert (24×24)
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button
                onClick={handleApply}
                disabled={!hasChanges}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white disabled:opacity-50"
              >
                Apply Settings
              </Button>
            </div>

            {hasChanges && <p className="text-xs text-yellow-500 text-center">You have unsaved changes</p>}
          </div>

          {/* Panic button settings */}
          <div className="space-y-2">
            <Label className="text-gray-800 dark:text-gray-200">Panic Button Link</Label>
            <input
              type="url"
              className="w-full p-2 rounded bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
              placeholder="https://example.com"
              value={panicLink}
              onChange={e => setPanicLink(e.target.value)}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This link will be used for the Panic button. Does not affect game field settings.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
