import { getAuthState, subscribeToAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRightLeft, Plus, Calendar, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { format, parseISO } from "date-fns";
import ShiftCard from "@/components/shifts/shift-card";

export default function ShiftTrading() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [user, setUser] = useState(getAuthState().user);
  
  useEffect(() => {
    const unsubscribe = subscribeToAuth((state) => {
      setUser(state.user);
    });
    return unsubscribe;
  }, []);

  const isManagerOrAdmin = user?.role === "manager" || user?.role === "admin";
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [reason, setReason] = useState("");
  const [urgency, setUrgency] = useState<"low" | "normal" | "urgent">("normal");

  const { data: availableShifts } = useQuery({
    queryKey: ["/api/shift-trades/available"],
  });

  const { data: employees } = useQuery({
    queryKey: ["/api/employees"],
    enabled: isManagerOrAdmin && isPostDialogOpen,
  });

  const { data: myTrades } = useQuery({
    queryKey: ["/api/shift-trades"],
  });

  const { data: pendingTrades } = useQuery({
    queryKey: ["/api/shift-trades/pending"],
    enabled: isManagerOrAdmin,
  });

  const approveMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const response = await apiRequest('PUT', `/api/shift-trades/${tradeId}/approve`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-trades/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-trades/available"] });
      toast({
        title: "Success",
        description: "Shift trade approved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve trade",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const response = await apiRequest('PUT', `/api/shift-trades/${tradeId}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-trades/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-trades/available"] });
      toast({
        title: "Success",
        description: "Shift trade rejected",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject trade",
        variant: "destructive",
      });
    },
  });

  // Fetch user's upcoming shifts
  const { data: myShifts, isLoading: shiftsLoading } = useQuery({
    queryKey: ["my-shifts-for-trade", isManagerOrAdmin],
    queryFn: async () => {
      // Get all shifts - we'll filter client-side for upcoming ones
      const endpoint = isManagerOrAdmin
        ? `/api/shifts/branch`
        : `/api/shifts`;

      const response = await apiRequest('GET', endpoint);
      const data = await response.json();
      console.log('Fetched shifts for trade:', data);
      return data;
    },
    enabled: isPostDialogOpen, // Only fetch when dialog is open
  });

  // Post shift trade mutation
  const postTradeMutation = useMutation({
    mutationFn: async (data: { shiftId: string; reason: string; urgency: string; toUserId?: string }) => {
      const payload: any = { ...data };
      if (payload.toUserId === "all") delete payload.toUserId;
      const response = await apiRequest('POST', '/api/shift-trades', payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shift-trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/shift-trades/available"] });
      toast({
        title: "Success",
        description: "Shift posted for trade successfully",
      });
      setIsPostDialogOpen(false);
      setSelectedShiftId("");
      setSelectedEmployeeId("all");
      setReason("");
      setUrgency("normal");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post shift for trade",
        variant: "destructive",
      });
    },
  });

  const handlePostShift = () => {
    if (!selectedShiftId) {
      toast({
        title: "Error",
        description: "Please select a shift to trade",
        variant: "destructive",
      });
      return;
    }
    if (!reason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a reason for trading",
        variant: "destructive",
      });
      return;
    }
    postTradeMutation.mutate({ 
      shiftId: selectedShiftId, 
      reason, 
      urgency,
      toUserId: selectedEmployeeId !== "all" ? selectedEmployeeId : undefined
    });
  };

  // Filter to get only future shifts that haven't been traded yet
  const upcomingShifts = (myShifts?.shifts || []).filter((shift: any) => {
    const shiftDate = new Date(shift.startTime);
    return shiftDate >= new Date();
  });

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-500/10 via-primary/5 to-background border border-violet-500/20 p-6 lg:p-8">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-500/20 to-transparent rounded-full -translate-y-32 translate-x-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-primary/10 to-transparent rounded-full translate-y-24 -translate-x-24 blur-3xl" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
              <ArrowRightLeft className="h-7 w-7 text-violet-500" />
            </div>
            <div>
              <h2 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                Shift Trading
              </h2>
              <p className="text-muted-foreground">Exchange shifts with your colleagues seamlessly</p>
            </div>
          </div>

          <Button className="btn-premium text-primary-foreground" data-testid="button-post-shift" onClick={() => setIsPostDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Post Available Shift
          </Button>
        </div>
      </div>

      {/* Post Shift Dialog */}
      <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Shift for Trade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Shift</Label>
              {shiftsLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading shifts...</div>
              ) : (
                <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a shift to trade" />
                  </SelectTrigger>
                  <SelectContent>
                    {upcomingShifts.length > 0 ? (
                      upcomingShifts.map((shift: any) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{format(new Date(shift.startTime), "MMM d, yyyy")}</span>
                            <Clock className="h-4 w-4 ml-2" />
                            <span>
                              {format(new Date(shift.startTime), "h:mm a")} - {format(new Date(shift.endTime), "h:mm a")}
                            </span>
                            {shift.user && (
                              <span className="ml-2 text-muted-foreground text-xs">
                                - {shift.user.firstName} {shift.user.lastName}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No upcoming shifts available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as "low" | "normal" | "urgent")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isManagerOrAdmin && (
              <div className="space-y-2">
                <Label>Assign to Employee (Optional)</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees (Open Trade)</SelectItem>
                    {employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Reason for Trading</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why do you need to trade this shift?"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPostDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePostShift} disabled={postTradeMutation.isPending}>
              {postTradeMutation.isPending ? "Posting..." : "Post Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals (Manager Only) */}
        {isManagerOrAdmin && (
          <Card className="lg:col-span-2 border-orange-200 bg-orange-50/30">
            <CardHeader>
              <CardTitle className="flex items-center text-orange-700">
                <Clock className="h-5 w-5 mr-2" />
                Pending Approvals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingTrades?.trades?.length > 0 ? (
                  pendingTrades.trades.map((trade: any) => (
                    <Card key={trade.id} className="bg-white">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {trade.fromUser.firstName} {trade.fromUser.lastName} 
                            <ArrowRightLeft className="inline h-4 w-4 mx-2 text-muted-foreground" />
                            {trade.toUser ? `${trade.toUser.firstName} ${trade.toUser.lastName}` : "Open Trade"}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {format(new Date(trade.shift.startTime), "MMM d, h:mm a")} - {format(new Date(trade.shift.endTime), "h:mm a")}
                          </div>
                          <div className="text-sm mt-1">Reason: {trade.reason}</div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => rejectMutation.mutate(trade.id)}
                            disabled={rejectMutation.isPending}
                          >
                            Reject
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => approveMutation.mutate(trade.id)}
                            disabled={approveMutation.isPending}
                          >
                            Approve
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No pending trade approvals
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Shifts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowRightLeft className="h-5 w-5 text-primary mr-2" />
              Available Shifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availableShifts?.trades?.length > 0 ? (
                availableShifts.trades.map((trade: any) => (
                  <ShiftCard
                    key={trade.id}
                    trade={trade}
                    type="available"
                    data-testid={`shift-available-${trade.id}`}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No available shifts to trade
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* My Posted Shifts */}
        <Card>
          <CardHeader>
            <CardTitle>My Posted Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myTrades?.trades?.length > 0 ? (
                myTrades.trades.map((trade: any) => (
                  <ShiftCard
                    key={trade.id}
                    trade={trade}
                    type="my"
                    data-testid={`shift-my-${trade.id}`}
                  />
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  You haven't posted any shifts for trade
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
