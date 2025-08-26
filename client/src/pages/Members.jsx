import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit, Trash2, User } from 'lucide-react';
import { membersAPI } from '@/services/api';

function MemberForm({ member, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    employeeId: member?.employeeId || '',
    firstName: member?.firstName || '',
    lastName: member?.lastName || '',
    dateOfBirth: member?.dateOfBirth ? format(new Date(member.dateOfBirth), 'yyyy-MM-dd') : '',
    gender: member?.gender || '',
    union: member?.union || ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        dateOfBirth: new Date(data.dateOfBirth).toISOString()
      };
      
      if (member) {
        return membersAPI.update(member.id, payload);
      } else {
        return membersAPI.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({
        title: member ? 'Member updated' : 'Member created',
        description: `${formData.firstName} ${formData.lastName} has been ${member ? 'updated' : 'added'} successfully.`,
      });
      onSuccess();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="employeeId">Employee ID</Label>
          <Input
            id="employeeId"
            value={formData.employeeId}
            onChange={(e) => handleChange('employeeId', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="union">Union</Label>
          <Select value={formData.union} onValueChange={(value) => handleChange('union', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select union" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Firefighters">Firefighters</SelectItem>
              <SelectItem value="Police">Police</SelectItem>
              <SelectItem value="EMS">EMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="dateOfBirth">Date of Birth</Label>
          <Input
            id="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => handleChange('dateOfBirth', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="gender">Gender</Label>
          <Select value={formData.gender} onValueChange={(value) => handleChange('gender', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male">Male</SelectItem>
              <SelectItem value="Female">Female</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : (member ? 'Update' : 'Create')}
        </Button>
      </div>
    </form>
  );
}

function MemberRow({ member, onEdit, onDelete }) {
  const unionColors = {
    Firefighters: 'bg-red-100 text-red-800',
    Police: 'bg-blue-100 text-blue-800',
    EMS: 'bg-green-100 text-green-800'
  };

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium">{member.firstName} {member.lastName}</div>
            <div className="text-sm text-muted-foreground">{member.employeeId}</div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={unionColors[member.union] || 'bg-gray-100 text-gray-800'}>
          {member.union}
        </Badge>
      </TableCell>
      <TableCell>{member.age} years</TableCell>
      <TableCell>{member.gender}</TableCell>
      <TableCell>{format(new Date(member.createdAt), 'MMM dd, yyyy')}</TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(member)}>
            <Edit className="h-3 w-3" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(member)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function Members() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnion, setSelectedUnion] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersAPI.getAll().then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => membersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast({
        title: 'Member deleted',
        description: 'Member has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete member',
        variant: 'destructive',
      });
    },
  });

  const filteredMembers = members?.filter(member => {
    const matchesSearch = !searchTerm || 
      member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesUnion = !selectedUnion || member.union === selectedUnion;
    
    return matchesSearch && matchesUnion;
  }) || [];

  const handleEdit = (member) => {
    setEditingMember(member);
    setDialogOpen(true);
  };

  const handleDelete = (member) => {
    if (confirm(`Are you sure you want to delete ${member.firstName} ${member.lastName}?`)) {
      deleteMutation.mutate(member.id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingMember(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">
            Manage first responder program participants
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingMember(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingMember ? 'Edit Member' : 'Add New Member'}
              </DialogTitle>
              <DialogDescription>
                {editingMember ? 'Update member information' : 'Add a new first responder to the program'}
              </DialogDescription>
            </DialogHeader>
            <MemberForm
              member={editingMember}
              onSuccess={handleDialogClose}
              onCancel={handleDialogClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name or employee ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Label htmlFor="union">Union</Label>
              <Select value={selectedUnion} onValueChange={setSelectedUnion}>
                <SelectTrigger>
                  <SelectValue placeholder="All unions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All unions</SelectItem>
                  <SelectItem value="Firefighters">Firefighters</SelectItem>
                  <SelectItem value="Police">Police</SelectItem>
                  <SelectItem value="EMS">EMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({filteredMembers.length})</CardTitle>
          <CardDescription>
            All registered first responders in the program
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Union</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <MemberRow
                  key={member.id}
                  member={member}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

