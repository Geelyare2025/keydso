import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Appointment, Client, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Loader2,
  Upload,
  UserCircle,
  CheckCircle,
  Clock,
  Briefcase,
  Mail,
  Phone,
  UserSquare,
  FileCheck,
  Globe2,
  UserCheck
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ViewAppointment() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: appointment, isLoading: appointmentLoading } = useQuery<Appointment>({
    queryKey: [`/api/appointments/${id}`],
    enabled: !!id,
  });

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: [`/api/clients/${appointment?.clientId}`],
    enabled: !!appointment?.clientId,
  });

  // Get collector and approver information
  const { data: collector } = useQuery<User>({
    queryKey: [`/api/users/${appointment?.collectedBy}`],
    enabled: !!appointment?.collectedBy,
  });

  const { data: approver } = useQuery<User>({
    queryKey: [`/api/users/${appointment?.approvedBy}`],
    enabled: !!appointment?.approvedBy,
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "PATCH",
        `/api/appointments/${id}`,
        {
          status: "approved",
          approvedBy: user!.id,
        }
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      toast({
        title: "Success",
        description: "Appointment approved successfully",
      });
    },
  });

  const uploadPdfMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);

      const res = await fetch(`/api/appointments/${id}/pdf`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/appointments/${id}`] });
      toast({
        title: "Success",
        description: "PDF uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (appointmentLoading || clientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!appointment || !client) {
    return (
      <div className="container mx-auto p-6 text-center">
        <p>Appointment not found</p>
        <Button onClick={() => setLocation("/dashboard")} variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast({
        title: "Error",
        description: "Please upload a PDF file",
        variant: "destructive",
      });
      return;
    }

    uploadPdfMutation.mutate(file);
  };

  const handleDownloadPDF = () => {
    if (!appointment.pdfUrl) {
      toast({
        title: "Error",
        description: "No PDF available for download",
        variant: "destructive",
      });
      return;
    }
    window.open(appointment.pdfUrl, '_blank');
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => setLocation("/dashboard")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileCheck className="mr-2 h-6 w-6" />
              Appointment Details
            </div>
            {appointment.status === "approved" && appointment.pdfUrl && (
              <Button onClick={handleDownloadPDF}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status and Date Section */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Clock className="mr-2 h-4 w-4" />
                <span className="font-semibold">Status:</span>
                <span className={`ml-2 ${appointment.status === "approved" ? "text-green-600" : "text-amber-600"}`}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </span>
              </div>
              {appointment.bookingDetails && (
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4" />
                  <span className="font-semibold">Date:</span>
                  <span className="ml-2">
                    {new Date(appointment.bookingDetails.date).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center">
                <UserCheck className="mr-2 h-4 w-4" />
                <span className="font-semibold">Collected by:</span>
                <span className="ml-2">{collector?.username || 'Unknown'}</span>
              </div>
              {approver && (
                <div className="flex items-center">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span className="font-semibold">Approved by:</span>
                  <span className="ml-2">{approver.username}</span>
                </div>
              )}
            </div>
          </div>

          {/* Client Information */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center text-muted-foreground mb-2">
                <UserCircle className="mr-2 h-4 w-4" />
                <h3 className="font-semibold">Personal Information</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <UserSquare className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{client.fullName}</span>
                </div>
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Passport: {client.passportNumber}</span>
                </div>
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>National ID: {client.nationalId}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Phone: {client.phoneNumber}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Email: {client.email}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center text-muted-foreground mb-2">
                <Briefcase className="mr-2 h-4 w-4" />
                <h3 className="font-semibold">Work Details</h3>
              </div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Work Type: {client.workType}</span>
                </div>
                <div className="flex items-center">
                  <Globe2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Workplace: {client.workplace}</span>
                </div>
                <div className="flex items-center">
                  <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Gender: {client.gender}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Approval Actions */}
          {user?.role === "approver" && appointment.status === "pending" && (
            <div className="flex gap-4 justify-end mt-6 pt-4 border-t">
              <Button 
                onClick={() => approveMutation.mutate()}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve Appointment
              </Button>
              <div className="relative">
                <Input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  id="pdf-upload"
                  onChange={handlePdfUpload}
                />
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload PDF
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}