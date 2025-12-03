import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  X, 
  Check, 
  Clock, 
  Palmtree,
  Heart,
  Briefcase,
  HelpCircle,
  CalendarDays,
  Send,
  ChevronRight
} from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import MobileHeader from "@/components/layout/mobile-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimeOffRequest {
  id: string;
  startDate: string;
  endDate: string;
  type: string;
  reason: string;
  status: string;
  requestedAt: string;
}

const timeOffTypes = [
  { value: 'vacation', label: 'Vacation', icon: Palmtree, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-950' },
  { value: 'sick', label: 'Sick Leave', icon: Heart, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-950' },
  { value: 'personal', label: 'Personal', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-950' },
  { value: 'other', label: 'Other', icon: HelpCircle, color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-800' },
];

export default function MobileTimeOff() {
  const currentUser = getCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [endDateOpen, setEndDateOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "vacation",
    reason: "",
  });

  // Fetch time off requests
  const { data: requestsData, isLoading } = useQuery({
    queryKey: ['mobile-time-off', currentUser?.id],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/time-off-requests');
      return response.json();
    },
  });

  // Submit time off request
  const submitMutation = useMutation({
    mutationFn: async (data: { type: string; reason: string }) => {
      const response = await apiRequest('POST', '/api/time-off-requests', {
        ...data,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        userId: currentUser?.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mobile-time-off'] });
      toast({
        title: "Request Submitted! 🎉",
        description: "Your time off request has been sent for approval",
      });
      setShowForm(false);
      setStartDate(new Date());
      setEndDate(new Date());
      setFormData({
        type: "vacation",
        reason: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide a reason for your request",
        variant: "destructive",
      });
      return;
    }
    submitMutation.mutate(formData);
  };

  const requests: TimeOffRequest[] = requestsData?.requests || [];

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { variant: any; icon: any; color: string }> = {
      pending: { variant: "secondary", icon: Clock, color: "text-amber-600" },
      approved: { variant: "default", icon: Check, color: "text-green-600" },
      rejected: { variant: "destructive", icon: X, color: "text-red-600" },
    };
    return configs[status] || configs.pending;
  };

  const getTypeConfig = (type: string) => {
    return timeOffTypes.find(t => t.value === type) || timeOffTypes[3];
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 pb-28">
      <MobileHeader
        title="Time Off"
        subtitle="Request and manage your time off"
        showBack={true}
        rightAction={
          !showForm && (
            <Button
              size="lg"
              onClick={() => setShowForm(true)}
              className="bg-primary text-primary-foreground font-semibold"
            >
              <Plus className="h-5 w-5 mr-1" />
              New
            </Button>
          )
        }
      />

      <div className="p-5 space-y-5">
        {/* Request Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <Card className="border-2 border-primary/30 shadow-xl bg-card/90 backdrop-blur">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <CalendarDays className="h-6 w-6 text-primary" />
                      New Request
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10"
                      onClick={() => setShowForm(false)}
                    >
                      <X className="h-6 w-6" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Type Selection */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">Type of Leave</Label>
                      <div className="grid grid-cols-2 gap-3">
                        {timeOffTypes.map((type) => {
                          const Icon = type.icon;
                          const isSelected = formData.type === type.value;
                          return (
                            <button
                              key={type.value}
                              type="button"
                              onClick={() => setFormData({ ...formData, type: type.value })}
                              className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                                isSelected 
                                  ? 'border-primary bg-primary/10 shadow-md' 
                                  : 'border-border hover:border-primary/30'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-lg ${type.bg} flex items-center justify-center`}>
                                <Icon className={`h-5 w-5 ${type.color}`} />
                              </div>
                              <span className="font-semibold text-base">{type.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Date Selection with Calendar Pickers */}
                    <div className="space-y-4">
                      <Label className="text-base font-semibold">Select Dates</Label>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Start Date Picker */}
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">Start Date</Label>
                          <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full h-14 justify-start text-left font-normal border-2 hover:border-primary/50",
                                  !startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                                <div className="flex flex-col items-start">
                                  <span className="text-xs text-muted-foreground">From</span>
                                  <span className="font-semibold">
                                    {startDate ? format(startDate, "MMM d, yyyy") : "Pick date"}
                                  </span>
                                </div>
                                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={startDate}
                                onSelect={(date) => {
                                  if (date) {
                                    setStartDate(date);
                                    // If end date is before start date, update it
                                    if (date > endDate) {
                                      setEndDate(date);
                                    }
                                  }
                                  setStartDateOpen(false);
                                }}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* End Date Picker */}
                        <div className="space-y-2">
                          <Label className="text-sm text-muted-foreground">End Date</Label>
                          <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full h-14 justify-start text-left font-normal border-2 hover:border-primary/50",
                                  !endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-5 w-5 text-primary" />
                                <div className="flex flex-col items-start">
                                  <span className="text-xs text-muted-foreground">To</span>
                                  <span className="font-semibold">
                                    {endDate ? format(endDate, "MMM d, yyyy") : "Pick date"}
                                  </span>
                                </div>
                                <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <Calendar
                                mode="single"
                                selected={endDate}
                                onSelect={(date) => {
                                  if (date) setEndDate(date);
                                  setEndDateOpen(false);
                                }}
                                disabled={(date) => date < startDate}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    {/* Days Count */}
                    {startDate && endDate && (
                      <div className="bg-gradient-to-r from-primary/10 to-violet-500/10 rounded-xl p-4 text-center border border-primary/20">
                        <p className="text-3xl font-bold text-primary">
                          {differenceInDays(endDate, startDate) + 1} day(s)
                        </p>
                        <p className="text-sm text-muted-foreground">Total time off requested</p>
                        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{format(startDate, "EEE, MMM d")}</span>
                          <ChevronRight className="h-3 w-3" />
                          <span>{format(endDate, "EEE, MMM d, yyyy")}</span>
                        </div>
                      </div>
                    )}

                    {/* Reason */}
                    <div className="space-y-2">
                      <Label htmlFor="reason" className="text-base font-semibold">Reason</Label>
                      <Textarea
                        id="reason"
                        value={formData.reason}
                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        placeholder="Please provide a reason for your request..."
                        rows={4}
                        className="text-lg resize-none"
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-14 text-lg"
                        onClick={() => setShowForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        className="flex-1 h-14 text-lg font-semibold"
                        disabled={submitMutation.isPending}
                      >
                        {submitMutation.isPending ? (
                          <>Submitting...</>
                        ) : (
                          <>
                            <Send className="h-5 w-5 mr-2" />
                            Submit
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Requests List */}
        <div className="space-y-4">
          <h3 className="font-bold text-xl px-1">Your Requests</h3>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground text-lg">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <Card className="border-0 shadow-lg bg-card/80 backdrop-blur">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Palmtree className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No Requests Yet</h3>
                <p className="text-muted-foreground text-lg mb-4">
                  Tap the "New" button to submit your first request
                </p>
                <Button onClick={() => setShowForm(true)} size="lg" className="h-14 px-8 text-lg">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Request
                </Button>
              </CardContent>
            </Card>
          ) : (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-3"
            >
              {requests.map((request) => {
                const typeConfig = getTypeConfig(request.type);
                const statusConfig = getStatusConfig(request.status);
                const TypeIcon = typeConfig.icon;
                const StatusIcon = statusConfig.icon;
                const days = differenceInDays(parseISO(request.endDate), parseISO(request.startDate)) + 1;

                return (
                  <motion.div key={request.id} variants={itemVariants}>
                    <Card className="border-0 shadow-md bg-card/80 backdrop-blur overflow-hidden">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-14 h-14 rounded-2xl ${typeConfig.bg} flex items-center justify-center shrink-0`}>
                            <TypeIcon className={`h-7 w-7 ${typeConfig.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="font-bold text-lg">{typeConfig.label}</h4>
                              <Badge variant={statusConfig.variant} className="flex items-center gap-1 px-3 py-1">
                                <StatusIcon className="h-3.5 w-3.5" />
                                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-base text-muted-foreground mb-2">
                              <CalendarIcon className="h-4 w-4" />
                              <span>
                                {format(parseISO(request.startDate), "MMM d")} - {format(parseISO(request.endDate), "MMM d, yyyy")}
                              </span>
                              <Badge variant="outline" className="ml-auto">{days} day{days !== 1 ? 's' : ''}</Badge>
                            </div>
                            <p className="text-base text-muted-foreground line-clamp-2">{request.reason}</p>
                            <p className="text-sm text-muted-foreground/60 mt-2">
                              Requested {format(parseISO(request.requestedAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

