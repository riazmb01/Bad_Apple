import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/mongodb-schema";

interface UsernamePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentUsername: string;
  onSuccess?: (newUsername: string) => void;
}

export default function UsernamePromptDialog({
  open,
  onOpenChange,
  userId,
  currentUsername,
  onSuccess
}: UsernamePromptDialogProps) {
  const [username, setUsername] = useState("");
  const { toast } = useToast();

  const updateUsernameMutation = useMutation({
    mutationFn: async (newUsername: string) => {
      return await apiRequest<User>(`/api/users/${userId}/username`, {
        method: "PATCH",
        body: JSON.stringify({ username: newUsername }),
        headers: { "Content-Type": "application/json" }
      });
    },
    onSuccess: (updatedUser) => {
      toast({
        title: "Username updated!",
        description: `Your new username is ${updatedUser.username}`,
      });
      
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ['/api/users', userId] });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      
      // Close dialog and call success callback
      onOpenChange(false);
      setUsername("");
      
      if (onSuccess) {
        onSuccess(updatedUser.username);
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update username",
        description: error.message || "Please try a different username",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedUsername = username.trim();
    
    if (!trimmedUsername) {
      toast({
        variant: "destructive",
        title: "Invalid username",
        description: "Username cannot be empty",
      });
      return;
    }

    if (trimmedUsername.length > 50) {
      toast({
        variant: "destructive",
        title: "Username too long",
        description: "Username must be 50 characters or less",
      });
      return;
    }

    updateUsernameMutation.mutate(trimmedUsername);
  };

  const handleSkip = () => {
    onOpenChange(false);
    setUsername("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="username-prompt-dialog">
        <DialogHeader>
          <DialogTitle data-testid="dialog-title">Customize Your Username</DialogTitle>
          <DialogDescription data-testid="dialog-description">
            You're currently using the auto-generated username "{currentUsername}". 
            Would you like to choose your own?
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">New Username</Label>
            <Input
              id="username"
              data-testid="input-username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={updateUsernameMutation.isPending}
              maxLength={50}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkip}
              disabled={updateUsernameMutation.isPending}
              data-testid="button-skip"
            >
              Maybe Later
            </Button>
            <Button
              type="submit"
              disabled={updateUsernameMutation.isPending || !username.trim()}
              data-testid="button-submit"
            >
              {updateUsernameMutation.isPending ? "Updating..." : "Update Username"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
