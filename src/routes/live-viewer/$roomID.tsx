import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt'

export const Route = createFileRoute('/live-viewer/$roomID')({
  component: LiveViewerPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      userID: search.userID as string | undefined,
      userName: search.userName as string | undefined,
    }
  },
})

function LiveViewerPage() {
  const { roomID } = Route.useParams()
  const search = Route.useSearch()
  const userID = search.userID || `audience_${Math.floor(Math.random() * 10000)}`
  const userName = search.userName || 'Student Viewer'

  const containerRef = useRef<HTMLDivElement>(null)

  const appID = Number(import.meta.env.VITE_ZEGOCLOUD_APP_ID)
  const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET

  useEffect(() => {
    if (!containerRef.current) return
    if (!appID || !serverSecret) return

    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomID,
      userID,
      userName
    )

    const zp = ZegoUIKitPrebuilt.create(kitToken)

    zp.joinRoom({
      container: containerRef.current,
      scenario: {
        mode: ZegoUIKitPrebuilt.LiveStreaming,
        config: {
          role: ZegoUIKitPrebuilt.Audience,
        },
      },
      showPreJoinView: false,
      turnOnMicrophoneWhenJoining: false,
      turnOnCameraWhenJoining: false,
      showMyCameraToggleButton: false,
      showMyMicrophoneToggleButton: false,
      showAudioVideoSettingsButton: false,
      showScreenSharingButton: false,
      showTextChat: true,
      showUserList: true,
      lowerLeftNotification: {
        showUserJoinAndLeave: false,
        showTextChat: true,
      }
    })

    return () => {
      if (zp) {
        zp.destroy()
      }
    }
  }, [roomID, userID, userName, appID, serverSecret])

  if (!appID || !serverSecret) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        <p>Stream Configuration Error (Keys Missing)</p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="w-screen h-screen bg-black overflow-hidden" 
    />
  )
}
