import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Plus, MessageSquare, Phone, Mail, Users, CheckCircle, Clock } from 'lucide-react';
import { encountersAPI, membersAPI } from '@/services/api';

const COMMUNICATION_ICONS = {
  Phone: Phone,
  Text: MessageSquare,
  Email: Mail,
  'In-Person': Users
};

const COMMUNICATION_COLORS = {
  Phone: 'bg-blue-100 text-blue-800',
  Text: 'bg-green-100 text-green-800',
  Email: 'bg-purple-100 text-purple-800',
  'In-Person': 'bg-orange-100 text-orange-800'
};

function EncounterForm({ encounter, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    memberId: encounter?.memberId || '',
    communicationType: encounter?.communicationType || '',
    topic: encounter?.topic || '',
    content: encounter?.content || '',
    callStatus: encounter?.callStatus || '',
    callerName: encounter?.callerName || '',
    encounterDate: encounter?.encounterDate ? format(new Date(encounter.encounterDate), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    isCompleted: encounter?.isCompleted || false
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersAPI.getAll().then(res => res.data),
  });

  const mutation = useMutation({
    mutationFn: (data) => {
      const payload = {
        ...data,
        encounterDate: new Date(data.encounterDate).toISOString()
      };
      
      if (encounter) {
        return encountersAPI.update(encounter.id, payload);
      } else {
        return encountersAPI.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      toast({
        title: encounter ? 'Encounter updated' : 'Encounter recorded',
        description: `Encounter has been ${encounter ? 'updated' : 'recorded'} successfully.`,
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
      <div>
        <Label htmlFor="memberId">Member</Label>
        <Select 
          value={formData.memberId} 
          onValueChange={(value) => handleChange('memberId', value)}
          disabled={!!encounter}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select member" />
          </SelectTrigger>
          <SelectContent>
            {members?.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.firstName} {member.lastName} ({member.employeeId})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="communicationType">Communication Type</Label>
          <Select 
            value={formData.communicationType} 
            onValueChange={(value) => handleChange('communicationType', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Phone">Phone</SelectItem>
              <SelectItem value="Text">Text</SelectItem>
              <SelectItem value="Email">Email</SelectItem>
              <SelectItem value="In-Person">In-Person</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="callStatus">Call Status</Label>
          <Input
            id="callStatus"
            value={formData.callStatus}
            onChange={(e) => handleChange('callStatus', e.target.value)}
            placeholder="e.g., Completed, No Answer, Voicemail"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="topic">Topic</Label>
          <Input
            id="topic"
            value={formData.topic}
            onChange={(e) => handleChange('topic', e.target.value)}
            placeholder="e.g., Blood Pressure Follow-up"
            required
          />
        </div>
        <div>
          <Label htmlFor="callerName">Caller Name</Label>
          <Input
            id="callerName"
            value={formData.callerName}
            onChange={(e) => handleChange('callerName', e.target.value)}
            placeholder="Staff member name"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => handleChange('content', e.target.value)}
          placeholder="Detailed notes about the encounter..."
          rows={4}
          required
        />
      </div>

      <div>
        <Label htmlFor="encounterDate">Encounter Date & Time</Label>
        <Input
          id="encounterDate"
          type="datetime-local"
          value={formData.encounterDate}
          onChange={(e) => handleChange('encounterDate', e.target.value)}
          required
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isCompleted"
          checked={formData.isCompleted}
          onCheckedChange={(checked) => handleChange('isCompleted', checked)}
        />
        <Label htmlFor="isCompleted">Mark as completed</Label>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : (encounter ? 'Update' : 'Record')}
        </Button>
      </div>
    </form>
  );
}

function EncounterRow({ encounter, onEdit, onDelete }) {
  const CommunicationIcon = COMMUNICATION_ICONS[encounter.communicationType] || MessageSquare;
  
  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">
            {encounter.memberName} {encounter.memberLastName}
          </div>
          <div className="text-sm text-muted-foreground">
            {encounter.employeeId} • Session #{encounter.sessionNumber}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className={COMMUNICATION_COLORS[encounter.communicationType]}>
          <CommunicationIcon className="h-3 w-3 mr-1" />
          {encounter.communicationType}
        </Badge>
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium">{encounter.topic}</div>
          <div className="text-sm text-muted-foreground">
            {encounter.content.length > 50 
              ? `${encounter.content.substring(0, 50)}...` 
              : encounter.content
            }
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div>
          <div className="text-sm">{encounter.callStatus}</div>
          <div className="text-xs text-muted-foreground">by {encounter.callerName}</div>
        </div>
      </TableCell>
      <TableCell>
        <div className="flex items-center space-x-2">
          {encounter.isCompleted ? (
            <Badge variant="default" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          ) : (
            <Badge variant="secondary">
              <Clock className="h-3 w-3 mr-1" />
              Pending
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell>
        {format(new Date(encounter.encounterDate), 'MMM dd, yyyy HH:mm')}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(encounter)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(encounter)}>
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function Encounters() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEncounter, setEditingEncounter] = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: encounters, isLoading } = useQuery({
    queryKey: ['encounters'],
    queryFn: () => encountersAPI.getAll().then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => encountersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['encounters'] });
      toast({
        title: 'Encounter deleted',
        description: 'Encounter has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete encounter',
        variant: 'destructive',
      });
    },
  });

  const filteredEncounters = encounters?.filter(encounter => {
    const matchesType = !filterType || encounter.communicationType === filterType;
    const matchesStatus = !filterStatus || 
      (filterStatus === 'completed' && encounter.isCompleted) ||
      (filterStatus === 'pending' && !encounter.isCompleted);
    
    return matchesType && matchesStatus;
  }) || [];

  const handleEdit = (encounter) => {
    setEditingEncounter(encounter);
    setDialogOpen(true);
  };

  const handleDelete = (encounter) => {
    if (confirm('Are you sure you want to delete this encounter?')) {
      deleteMutation.mutate(encounter.id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingEncounter(null);
  };

  // Calculate statistics
  const stats = encounters?.reduce((acc, encounter) => {
    acc.total++;
    acc.typeCounts[encounter.communicationType] = (acc.typeCounts[encounter.communicationType] || 0) + 1;
    if (encounter.isCompleted) acc.completed++;
    return acc;
  }, {
    total: 0,
    completed: 0,
    typeCounts: {}
  }) || { total: 0, completed: 0, typeCounts: {} };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Encounters</h1>
          <p className="text-muted-foreground">
            Track communication and follow-up sessions
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingEncounter(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Encounter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                {editingEncounter ? 'Edit Encounter' : 'Record New Encounter'}
              </DialogTitle>
              <DialogDescription>
                {editingEncounter ? 'Update encounter details' : 'Record a new communication encounter'}
              </DialogDescription>
            </DialogHeader>
            <EncounterForm
              encounter={editingEncounter}
              onSuccess={handleDialogClose}
              onCancel={handleDialogClose}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Encounters</CardTitle>
            <MessageSquare className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Phone Calls</CardTitle>
            <Phone className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.typeCounts.Phone || 0}</div>
            <p className="text-xs text-muted-foreground">Voice communications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total - stats.completed}</div>
            <p className="text-xs text-muted-foreground">Require follow-up</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="w-48">
              <Label htmlFor="type">Communication Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All types</SelectItem>
                  <SelectItem value="Phone">Phone</SelectItem>
                  <SelectItem value="Text">Text</SelectItem>
                  <SelectItem value="Email">Email</SelectItem>
                  <SelectItem value="In-Person">In-Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Encounters Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Encounters ({filteredEncounters.length})</CardTitle>
          <CardDescription>
            Latest communication encounters with members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Topic & Content</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Completion</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEncounters.map((encounter) => (
                <EncounterRow
                  key={encounter.id}
                  encounter={encounter}
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

