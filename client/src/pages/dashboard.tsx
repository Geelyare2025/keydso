import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Appointment, Client } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarPlus, FileText, Loader2, UserPlus, Users, LogOut, KeyRound } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>;

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("pending");
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { toast } = useToast();

  const passwordForm = useForm<PasswordChangeFormData>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
  });

  const onChangePassword = async (data: PasswordChangeFormData) => {
    try {
      await apiRequest("POST", "/api/users/change-password", data);
      toast({
        title: "Success",
        description: "Password changed successfully",
      });
      setIsPasswordDialogOpen(false);
      passwordForm.reset({
        currentPassword: '',
        newPassword: '',
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (appointmentsLoading || clientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const filteredAppointments = appointments?.filter(
    appointment => user?.role === "admin" ? true : appointment.status === activeTab
  );

  const getClientName = (clientId: number) => {
    const client = clients?.find((c) => c.id === clientId);
    return client?.fullName || "Unknown Client";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10">
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="container mx-auto py-4 px-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-wider">KEYDSO</h1>
            <div className="flex gap-4">
              {user?.role === "admin" && (
                <div className="flex gap-4">
                  <Link href="/admin/users">
                    <Button variant="ghost" className="text-white hover:text-white/80">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                  </Link>
                  <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" className="text-white hover:text-white/80">
                        <KeyRound className="h-4 w-4 mr-2" />
                        Change Password
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Change Password</DialogTitle>
                      </DialogHeader>
                      <Form {...passwordForm}>
                        <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-4">
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Current Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="submit" className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                            Change Password
                          </Button>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              <Button variant="ghost" className="text-white hover:text-white/80" onClick={() => logoutMutation.mutate()}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold">Welcome, {user?.username}</h2>
            <p className="text-muted-foreground capitalize">Role: {user?.role}</p>
          </div>
          {user?.role === "collector" && (
            <Link href="/appointments/new">
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <UserPlus className="mr-2 h-4 w-4" />
                New Appointment
              </Button>
            </Link>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredAppointments?.map((appointment) => (
                <Link key={appointment.id} href={`/appointments/${appointment.id}`}>
                  <Card className="cursor-pointer hover:shadow-lg transition-all duration-300 border-green-100">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {getClientName(appointment.clientId)}
                        {appointment.status === "approved" && (
                          <FileText className="h-5 w-5 text-green-600" />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        Created: {new Date(appointment.createdAt).toLocaleDateString()}
                      </div>
                      {appointment.bookingDetails && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          Booked for: {new Date(appointment.bookingDetails.date).toLocaleDateString()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}

              {(!filteredAppointments || filteredAppointments.length === 0) && (
                <Card className="col-span-full">
                  <CardContent className="flex flex-col items-center justify-center p-6">
                    <CalendarPlus className="h-12 w-12 text-green-600/50 mb-4" />
                    <p className="text-center text-muted-foreground">
                      No {activeTab} appointments found
                    </p>
                    {user?.role === "collector" && (
                      <Link href="/appointments/new">
                        <Button variant="outline" className="mt-4 border-green-200 hover:bg-green-50">
                          Create New Appointment
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}