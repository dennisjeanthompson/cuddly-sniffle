import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRightLeft, 
  Clock, 
  User, 
  X, 
  Check,
  AlertTriangle,
  Zap,
  ChevronRight,
  HandMetal,
  Users
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import MuiMobileHeader from "@/components/mui/mui-mobile-header";
import MuiMobileBottomNav from "@/components/mui/mui-mobile-bottom-nav";
import { motion, AnimatePresence } from "framer-motion";

interface ShiftTrade {
  id: string;
  shift: {
    id: string;
    startTime: string;
    endTime: string;
    position: string;
  };
  fromUser: {
    firstName: string;
    lastName: string;
  };
  reason: string;
  status: string;
  urgency: string;
}

export default function MobileShiftTrading() {
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"available" | "my">("available");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    reason: "",
  });

  // Fetch available shifts with real-time updates
  const { data: availableData, isLoading: loadingAvailable, refetch: refetchAvailable } = useQuery({
    queryKey: ['mobile-shift-trades-available'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/shift-trades/available');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time trade updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  // Fetch my trades with real-time updates
  const { data: myTradesData, isLoading: loadingMy, refetch: refetchMyTrades } = useQuery({
    queryKey: ['mobile-shift-trades-my'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/shift-trades');
      return response.json();
    },
    refetchInterval: 5000, // Poll every 5 seconds for real-time trade updates
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true,
  });

  // Take shift mutation
  const takeShiftMutation = useMutation({
    mutationFn: (tradeId: string) =>
      apiRequest("PUT", `/api/shift-trades/${tradeId}/take`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-shift-trades-available'] });
      queryClient.invalidateQueries({ queryKey: ['mobile-shift-trades-my'] });
      console.log("✅ Shift trade request sent successfully");
      toast({
        title: "Request Sent! 🎉",
        description: "Your shift trade request has been sent for approval",
      });
    },
    onError: (error: any) => {
      console.error("❌ Failed to take shift:", error);
      const message = error?.message || "Failed to take shift";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Cancel trade mutation
  const cancelTradeMutation = useMutation({
    mutationFn: (tradeId: string) =>
      apiRequest("DELETE", `/api/shift-trades/${tradeId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-shift-trades-my'] });
      console.log("✅ Shift trade cancelled successfully");
      toast({
        title: "Trade Cancelled",
        description: "Your shift trade has been cancelled",
      });
    },
    onError: (error: any) => {
      console.error("❌ Failed to cancel trade:", error);
      const message = error?.message || "Failed to cancel trade";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const availableTrades: ShiftTrade[] = (availableData?.trades || []).filter(t => t?.shift?.startTime && t?.shift?.endTime);
  const myTrades: ShiftTrade[] = (myTradesData?.trades || []).filter(t => t?.shift?.startTime && t?.shift?.endTime);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { variant: any; icon: any; color: string }> = {
      pending: { variant: "secondary", icon: Clock, color: "text-amber-600" },
      approved: { variant: "default", icon: Check, color: "text-green-600" },
      rejected: { variant: "destructive", icon: X, color: "text-red-600" },
    };
    return configs[status] || configs.pending;
  };

  const getUrgencyConfig = (urgency: string) => {
    const configs: Record<string, { variant: any; icon: any; color: string; bg: string }> = {
      low: { variant: "secondary", icon: Clock, color: "text-gray-600", bg: "bg-gray-100 dark:bg-gray-800" },
      normal: { variant: "default", icon: Check, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-950" },
      urgent: { variant: "destructive", icon: Zap, color: "text-red-600", bg: "bg-red-100 dark:bg-red-950" },
    };
    return configs[urgency] || configs.normal;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const renderShiftCard = (trade: ShiftTrade, type: "available" | "my") => {
    const urgencyConfig = getUrgencyConfig(trade.urgency);
    const statusConfig = getStatusConfig(trade.status);
    const UrgencyIcon = urgencyConfig.icon;
    const StatusIcon = statusConfig.icon;
    
    // Safely parse dates with null checks
    if (!trade?.shift?.startTime || !trade?.shift?.endTime) {
      console.warn('Invalid shift data:', trade);
      return null;
    }
    
    try {
      const shiftDate = parseISO(trade.shift.startTime);
      const endTime = parseISO(trade.shift.endTime);
      
      // Validate dates are valid
      if (isNaN(shiftDate.getTime()) || isNaN(endTime.getTime())) {
        console.warn('Invalid date format:', trade.shift);
        return null;
      }

      return (
        <motion.div key={trade.id} variants={itemVariants}>
          <Card className={`border-0 shadow-md bg-card/80 backdrop-blur overflow-hidden ${
            trade.urgency === 'urgent' ? 'ring-2 ring-red-500/30' : ''
          }`}>
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                {/* Left side - Avatar/Icon */}
                <div className={`w-14 h-14 rounded-2xl ${urgencyConfig.bg} flex items-center justify-center shrink-0`}>
                  {type === 'available' ? (
                    <span className="text-xl font-bold text-muted-foreground">
                      {trade.fromUser?.firstName?.[0]}{trade.fromUser?.lastName?.[0]}
                    </span>
                  ) : (
                    <ArrowRightLeft className={`h-7 w-7 ${urgencyConfig.color}`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-bold text-lg">{trade.shift.position}</h4>
                      {type === 'available' && trade.fromUser && (
                        <p className="text-base text-muted-foreground flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {trade.fromUser.firstName} {trade.fromUser.lastName}
                        </p>
                      )}
                    </div>
                    {type === 'my' ? (
                      <Badge variant={statusConfig.variant} className="flex items-center gap-1 px-3 py-1">
                        <StatusIcon className="h-3.5 w-3.5" />
                        {(trade.status ? trade.status.charAt(0).toUpperCase() + trade.status.slice(1) : "Unknown")}
                      </Badge>
                    ) : (
                      <Badge variant={urgencyConfig.variant} className="flex items-center gap-1 px-3 py-1">
                        <UrgencyIcon className="h-3.5 w-3.5" />
                        {(trade.urgency ? trade.urgency.charAt(0).toUpperCase() + trade.urgency.slice(1) : "Unknown")}
                      </Badge>
                    )}
                  </div>

                  {/* Time Info */}
                  <div className="flex items-center gap-2 text-base mb-3 bg-muted/50 rounded-lg p-3">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-semibold">{format(shiftDate, "EEEE, MMM d")}</p>
                      <p className="text-muted-foreground">
                        {format(shiftDate, "h:mm a")} - {format(endTime, "h:mm a")}
                      </p>
                    </div>
                  </div>

                  {/* Reason */}
                  <p className="text-base text-muted-foreground mb-4 line-clamp-2">{trade.reason}</p>

                  {/* Action Button */}
                  {type === "available" ? (
                    <Button
                      className="w-full h-14 text-lg font-semibold"
                      onClick={() => takeShiftMutation.mutate(trade.id)}
                      disabled={takeShiftMutation.isPending}
                    >
                      <HandMetal className="h-5 w-5 mr-2" />
                      Take This Shift
                    </Button>
                  ) : trade.status === "pending" ? (
                    <Button
                      variant="destructive"
                      className="w-full h-14 text-lg font-semibold"
                      onClick={() => cancelTradeMutation.mutate(trade.id)}
                      disabled={cancelTradeMutation.isPending}
                    >
                      <X className="h-5 w-5 mr-2" />
                      Cancel Trade
                    </Button>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      );
    } catch (error) {
      console.error('Error rendering shift card:', error, trade);
      return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-28">
      <MuiMobileHeader
        title="Shift Trading"
        subtitle="Swap shifts with coworkers"
        showBack={true}
      />

      <div className="p-5 space-y-5">
        {/* Tab Switcher with Request Button */}
        <div className="flex gap-2">
          <div className="flex-1 flex gap-2 bg-muted p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab("available")}
              className={`flex-1 py-3.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === "available"
                  ? "bg-background text-foreground shadow-md"
                  : "text-muted-foreground"
              }`}
            >
              <Users className="h-5 w-5" />
              Available
              {availableTrades.length > 0 && (
                <Badge variant="default" className="ml-1">{availableTrades.length}</Badge>
              )}
            </button>
            <button
              onClick={() => setActiveTab("my")}
              className={`flex-1 py-3.5 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                activeTab === "my"
                  ? "bg-background text-foreground shadow-md"
                  : "text-muted-foreground"
              }`}
            >
              <ArrowRightLeft className="h-5 w-5" />
              My Trades
              {myTrades.length > 0 && (
                <Badge variant="secondary" className="ml-1">{myTrades.length}</Badge>
              )}
            </button>
          </div>
          <Button
            size="lg"
            className="px-4 py-3.5 h-auto rounded-lg"
            onClick={() => setShowRequestModal(true)}
          >
            <ArrowRightLeft className="h-5 w-5 mr-2" />
            Request
          </Button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "available" ? (
            <motion.div
              key="available"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {loadingAvailable ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ArrowRightLeft className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  <p className="text-muted-foreground text-lg">Loading available shifts...</p>
                </div>
              ) : availableTrades.length === 0 ? (
                <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
                  <CardContent className="p-12 text-center">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">No Shifts Available</h3>
                    <p className="text-muted-foreground text-lg">
                      Check back later for shifts to pick up
                    </p>
                  </CardContent>
                </Card>
              ) : (
                availableTrades.map((trade) => renderShiftCard(trade, "available"))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="my"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {loadingMy ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <ArrowRightLeft className="h-10 w-10 text-primary animate-pulse" />
                  </div>
                  <p className="text-muted-foreground text-lg">Loading your trades...</p>
                </div>
              ) : myTrades.length === 0 ? (
                <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
                  <CardContent className="p-12 text-center">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <ArrowRightLeft className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">No Active Trades</h3>
                    <p className="text-muted-foreground text-lg">
                      You haven't posted any shifts for trade yet
                    </p>
                  </CardContent>
                </Card>
              ) : (
                myTrades.map((trade) => renderShiftCard(trade, "my"))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Request Shift Modal */}
      <AnimatePresence>
        {showRequestModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowRequestModal(false)}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
            >
              <div>
                <h2 className="text-2xl font-bold mb-2">Request Shift Trade</h2>
                <p className="text-muted-foreground">
                  Tell your coworkers and manager why you want to trade
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold">
                  Reason for Trade
                </label>
                <textarea
                  value={requestFormData.reason}
                  onChange={(e) => setRequestFormData({ ...requestFormData, reason: e.target.value })}
                  placeholder="E.g., Personal appointment, need to swap schedules, etc."
                  className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={4}
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={() => {
                    setShowRequestModal(false);
                    setRequestFormData({ reason: "" });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 h-12 text-base font-semibold"
                  onClick={() => {
                    if (requestFormData.reason.trim()) {
                      toast({
                        title: "Got your request!",
                        description: "Please select a shift from the available shifts tab",
                      });
                      setShowRequestModal(false);
                      setRequestFormData({ reason: "" });
                      setActiveTab("available");
                    } else {
                      toast({
                        title: "Please enter a reason",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MuiMobileBottomNav />
    </div>
  );
}

