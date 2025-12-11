import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trophy, Medal, Award, Crown } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  referral_code: string;
  total: number;
  isCurrentUser: boolean;
}

interface AffiliateLeaderboardProps {
  currentAffiliateId: string | null;
  currentReferralCode: string | null;
}

export default function AffiliateLeaderboard({ currentAffiliateId, currentReferralCode }: AffiliateLeaderboardProps) {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'all' | 'month' | 'week' | 'today'>('all');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    fetchLeaderboard();
  }, [period, currentAffiliateId]);

  const getDateFilter = () => {
    const now = new Date();
    switch (period) {
      case 'today':
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return today.toISOString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekAgo.toISOString();
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1);
        return monthAgo.toISOString();
      default:
        return null;
    }
  };

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const dateFilter = getDateFilter();

      if (period === 'all') {
        // For all time, use total_earnings from affiliates table
        const { data, error } = await supabase
          .from('affiliates')
          .select('id, referral_code, total_earnings')
          .order('total_earnings', { ascending: false })
          .limit(10);

        if (error) throw error;

        const entries: LeaderboardEntry[] = (data || []).map((a, index) => ({
          rank: index + 1,
          referral_code: a.referral_code,
          total: Number(a.total_earnings),
          isCurrentUser: a.id === currentAffiliateId,
        }));

        setLeaderboard(entries);
      } else {
        // For time-based filters, aggregate from affiliate_earnings
        const { data: earningsData, error } = await supabase
          .from('affiliate_earnings')
          .select('affiliate_id, amount, created_at')
          .gte('created_at', dateFilter!);

        if (error) throw error;

        // Aggregate earnings by affiliate
        const aggregated: Record<string, number> = {};
        (earningsData || []).forEach((e) => {
          aggregated[e.affiliate_id] = (aggregated[e.affiliate_id] || 0) + Number(e.amount);
        });

        // Get affiliate details for top earners
        const affiliateIds = Object.keys(aggregated);
        if (affiliateIds.length === 0) {
          setLeaderboard([]);
          setLoading(false);
          return;
        }

        const { data: affiliatesData } = await supabase
          .from('affiliates')
          .select('id, referral_code')
          .in('id', affiliateIds);

        const affiliateMap = new Map((affiliatesData || []).map(a => [a.id, a.referral_code]));

        // Sort and take top 10
        const sorted = Object.entries(aggregated)
          .map(([id, total]) => ({
            id,
            referral_code: affiliateMap.get(id) || 'Unknown',
            total,
          }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 10);

        const entries: LeaderboardEntry[] = sorted.map((a, index) => ({
          rank: index + 1,
          referral_code: a.referral_code,
          total: a.total,
          isCurrentUser: a.id === currentAffiliateId,
        }));

        setLeaderboard(entries);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const maskReferralCode = (code: string, isCurrentUser: boolean) => {
    if (isCurrentUser) return code;
    if (code.length <= 4) return '****';
    return code.substring(0, 2) + '****' + code.substring(code.length - 2);
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return "Today's";
      case 'week': return "This Week's";
      case 'month': return "This Month's";
      default: return 'All Time';
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Top Affiliates
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as typeof period)} className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">All Time</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
          </TabsList>

          <div className="min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No earnings recorded {period !== 'all' ? `for ${getPeriodLabel().toLowerCase()}` : 'yet'}</p>
                <p className="text-sm mt-1">Be the first to earn commissions!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div
                    key={`${entry.rank}-${entry.referral_code}`}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                      entry.isCurrentUser
                        ? 'bg-primary/20 border border-primary/50'
                        : 'bg-secondary/30 hover:bg-secondary/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center">
                        {getRankIcon(entry.rank)}
                      </div>
                      <div>
                        <p className="font-mono font-medium">
                          {maskReferralCode(entry.referral_code, entry.isCurrentUser)}
                          {entry.isCurrentUser && (
                            <Badge variant="outline" className="ml-2 text-xs border-primary text-primary">
                              You
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${entry.rank <= 3 ? 'text-primary' : ''}`}>
                        ${entry.total.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
