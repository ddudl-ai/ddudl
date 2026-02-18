import { NextRequest } from 'next/server';
import { MasterService } from '@/lib/services/master';
import { 
  withApiHandler, 
  authenticateUser, 
  getSearchParams, 
  validateRequiredParams,
  createApiResponse,
  createApiError 
} from '@/lib/api/utils';
import type { MasterDashboardStats } from '@/types';

const masterService = new MasterService();

// GET /api/master/dashboard - Get dashboard statistics
export const GET = withApiHandler(async (request: NextRequest) => {
  // authentication 확인
  const { user, error: authError } = await authenticateUser();
  if (authError || !user) {
    return createApiError('Unauthorized', 401, 'AUTH_REQUIRED');
  }

  // 파라미터 추출 및 검증
  const searchParams = getSearchParams(request);
  const channelId = searchParams.get('channel_id');
  const period = (searchParams.get('period') as '24h' | '7d' | '30d') || '24h';

  const { valid, missing } = validateRequiredParams({ channel_id: channelId }, ['channel_id']);
  if (!valid) {
    return createApiError(`Missing required parameters: ${missing.join(', ')}`, 400, 'MISSING_PARAMS');
  }

  // 마스터 permission 확인
  const master = await masterService.checkMasterPermission(user.id, channelId!);
  if (!master) {
    return createApiError('Not authorized for this channel', 403, 'INSUFFICIENT_PERMISSIONS');
  }

  // 대시보드 통계 조회
  const stats = await masterService.getDashboardStats(channelId!, period);

  return createApiResponse(stats, true, 'Dashboard statistics retrieved successfully');
});