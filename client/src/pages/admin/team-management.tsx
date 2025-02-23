import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Team, User } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeamSchema } from "@shared/schema";
import {
  DndContext,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, UserPlus, Users } from "lucide-react";

export default function TeamManagement() {
  const { user } = useAuth();
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );

  // Query for teams
  const { data: teams, isLoading: teamsLoading } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  // Query for all users
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Form for creating new team
  const form = useForm({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Mutation for creating new team
  const createTeamMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/teams", {
        ...data,
        createdBy: user!.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({
        title: "Success",
        description: "Team created successfully",
      });
      form.reset();
    },
  });

  // Mutation for moving team member
  const moveTeamMemberMutation = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: number; userId: number }) => {
      const res = await apiRequest("POST", "/api/teams/members", {
        teamId,
        userId,
        addedBy: user!.id,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "Team member moved successfully",
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const userId = parseInt(active.id.toString());
    const teamId = parseInt(over.id.toString());

    if (userId && teamId) {
      moveTeamMemberMutation.mutate({ userId, teamId });
    }
  };

  if (!user || user.role !== "admin") {
    return <div>Unauthorized</div>;
  }

  if (teamsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  const unassignedUsers = users?.filter(u => !u.teamId && u.role !== "admin") || [];

  return (
    <div className="container mx-auto p-6">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => window.history.back()}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Create Team Form */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Team</CardTitle>
            <CardDescription>Create a new team and add members to it.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createTeamMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createTeamMutation.isPending}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create Team
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Unassigned Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Unassigned Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DndContext
              sensors={sensors}
              modifiers={[restrictToWindowEdges]}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-2">
                {unassignedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="p-3 border rounded-lg cursor-move"
                    draggable
                    data-id={user.id}
                  >
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {user.role}
                    </div>
                  </div>
                ))}
                {unassignedUsers.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No unassigned users
                  </div>
                )}
              </div>
            </DndContext>
          </CardContent>
        </Card>

        {/* Team List */}
        <div className="space-y-6">
          {teams?.map((team) => (
            <Card key={team.id} data-id={team.id}>
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {users?.filter(u => u.teamId === team.id).map((member) => (
                    <div
                      key={member.id}
                      className="p-3 border rounded-lg"
                    >
                      <div className="font-medium">{member.username}</div>
                      <div className="text-sm text-muted-foreground capitalize">
                        {member.role}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}