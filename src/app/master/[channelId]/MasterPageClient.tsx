"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { MasterDashboard } from "@/components/master/MasterDashboard"
import { ModerationQueue } from "@/components/master/ModerationQueue"

interface MasterPageClientProps {
  channelId: string
}

export function MasterPageClient({ channelId }: MasterPageClientProps) {
  const [notificationCount] = useState(5)

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">서브레딧 마스터</h1>
              <p className="text-muted-foreground">c/{channelId} 관리</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">온라인</Badge>
              <Badge variant="secondary">{notificationCount}개 알림</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="overview" className="w-full">
          <div className="border-b">
            <div className="px-6">
              <TabsList className="h-14 bg-transparent">
                <TabsTrigger value="overview" className="text-base">
                  개요
                </TabsTrigger>
                <TabsTrigger value="moderation" className="text-base">
                  모더레이션
                </TabsTrigger>
                <TabsTrigger value="policies" className="text-base">
                  정책 설정
                </TabsTrigger>
                <TabsTrigger value="analytics" className="text-base">
                  분석
                </TabsTrigger>
                <TabsTrigger value="notifications" className="text-base relative">
                  알림
                  {notificationCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="overview" className="p-0">
            <MasterDashboard channelId={channelId} />
          </TabsContent>

          <TabsContent value="moderation" className="p-0">
            <ModerationQueue channelId={channelId} />
          </TabsContent>

          <TabsContent value="policies" className="p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">정책 설정</h2>
              <p className="text-muted-foreground">정책 설정 컴포넌트가 여기에 표시됩니다.</p>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">분석</h2>
              <p className="text-muted-foreground">분석 대시보드가 여기에 표시됩니다.</p>
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold mb-6">알림</h2>
              <p className="text-muted-foreground">알림 센터가 여기에 표시됩니다.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}