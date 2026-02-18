"use client&quot;

import { useState } from &quot;react&quot;
import { Tabs, TabsContent, TabsList, TabsTrigger } from &quot;@/components/ui/tabs&quot;
import { Badge } from &quot;@/components/ui/badge&quot;
import { MasterDashboard } from &quot;@/components/master/MasterDashboard&quot;
import { ModerationQueue } from &quot;@/components/master/ModerationQueue&quot;

interface MasterPageClientProps {
  channelId: string
}

export function MasterPageClient({ channelId }: MasterPageClientProps) {
  const [notificationCount] = useState(5)

  return (
    <div className=&quot;min-h-screen bg-background&quot;>
      <div className=&quot;border-b&quot;>
        <div className=&quot;max-w-7xl mx-auto px-6 py-4&quot;>
          <div className=&quot;flex items-center justify-between&quot;>
            <div>
              <h1 className=&quot;text-2xl font-bold&quot;>서브레딧 마스터</h1>
              <p className=&quot;text-muted-foreground&quot;>c/{channelId} 관리</p>
            </div>
            <div className=&quot;flex items-center space-x-2&quot;>
              <Badge variant=&quot;outline&quot;>온라인</Badge>
              <Badge variant=&quot;secondary&quot;>{notificationCount}개 알림</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className=&quot;max-w-7xl mx-auto&quot;>
        <Tabs defaultValue=&quot;overview&quot; className=&quot;w-full&quot;>
          <div className=&quot;border-b&quot;>
            <div className=&quot;px-6&quot;>
              <TabsList className=&quot;h-14 bg-transparent&quot;>
                <TabsTrigger value=&quot;overview&quot; className=&quot;text-base&quot;>
                  개요
                </TabsTrigger>
                <TabsTrigger value=&quot;moderation&quot; className=&quot;text-base&quot;>
                  모더레이션
                </TabsTrigger>
                <TabsTrigger value=&quot;policies&quot; className=&quot;text-base&quot;>
                  정책 설정
                </TabsTrigger>
                <TabsTrigger value=&quot;analytics&quot; className=&quot;text-base&quot;>
                  분석
                </TabsTrigger>
                <TabsTrigger value=&quot;notifications&quot; className=&quot;text-base relative&quot;>
                  알림
                  {notificationCount > 0 && (
                    <Badge
                      variant=&quot;destructive&quot;
                      className=&quot;absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center&quot;
                    >
                      {notificationCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value=&quot;overview&quot; className=&quot;p-0&quot;>
            <MasterDashboard channelId={channelId} />
          </TabsContent>

          <TabsContent value=&quot;moderation&quot; className=&quot;p-0&quot;>
            <ModerationQueue channelId={channelId} />
          </TabsContent>

          <TabsContent value=&quot;policies&quot; className=&quot;p-6&quot;>
            <div className=&quot;max-w-4xl mx-auto&quot;>
              <h2 className=&quot;text-2xl font-bold mb-6&quot;>정책 설정</h2>
              <p className=&quot;text-muted-foreground&quot;>정책 설정 컴포넌트가 여기에 표시됩니다.</p>
            </div>
          </TabsContent>

          <TabsContent value=&quot;analytics&quot; className=&quot;p-6&quot;>
            <div className=&quot;max-w-4xl mx-auto&quot;>
              <h2 className=&quot;text-2xl font-bold mb-6&quot;>분석</h2>
              <p className=&quot;text-muted-foreground&quot;>분석 대시보드가 여기에 표시됩니다.</p>
            </div>
          </TabsContent>

          <TabsContent value=&quot;notifications&quot; className=&quot;p-6&quot;>
            <div className=&quot;max-w-4xl mx-auto&quot;>
              <h2 className=&quot;text-2xl font-bold mb-6&quot;>알림</h2>
              <p className=&quot;text-muted-foreground&quot;>알림 센터가 여기에 표시됩니다.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}