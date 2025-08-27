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
import { Plus, Heart, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { bloodPressureAPI, membersAPI } from '@/services/api';

const HTN_STATUS_COLORS = {
  Normal: 'bg-green-100 text-green-800',
  Elevated: 'bg-yellow-100 text-yellow-800',
  'Stage 1': 'bg-orange-100 text-orange-800',
  'Stage 2': 'bg-red-100 text-red-800',
  Crisis: 'bg-red-200 text-red-900'
};

const HTN_STATUS_ICONS = {
  Normal: TrendingUp,
  Elevated: TrendingUp,
  'Stage 1': AlertTriangle,
  'Stage 2': AlertTriangle,
  Crisis: AlertTriangle
};

function BloodPressureForm({ reading, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    memberId: reading?.memberId || '',
    systolic: reading?.systolic || '',
    diastolic: reading?.diastolic || '',
    heartRate: reading?.heartRate || '',
    readingDate: reading?.readingDate ? format(new Date(reading.readingDate), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm")
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
        systolic: parseInt(data.systolic),
        diastolic: parseInt(data.diastolic),
        heartRate: data.heartRate ? parseInt(data.heartRate) : undefined,
        readingDate: new Date(data.readingDate).toISOString()
      };
      
      if (reading) {
        return bloodPressureAPI.update(reading.id, payload);
      } else {
        return bloodPressureAPI.create(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloodPressure'] });
      toast({
        title: reading ? 'Reading updated' : 'Reading recorded',
        description: `Blood pressure reading has been ${reading ? 'updated' : 'recorded'} successfully.`,
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
    
    // Validation
    const systolic = parseInt(formData.systolic);
    const diastolic = parseInt(formData.diastolic);
    
    if (systolic <= diastolic) {
      toast({
        title: 'Invalid Reading',
        description: 'Systolic pressure must be greater than diastolic pressure.',
        variant: 'destructive',
      });
      return;
    }
    
    if (systolic < 70 || systolic > 300 || diastolic < 40 || diastolic > 200) {
      toast({
        title: 'Invalid Reading',
        description: 'Blood pressure values are outside normal ranges.',
        variant: 'destructive',
      });
      return;
    }
    
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
          disabled={!!reading}
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

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="systolic">Systolic (mmHg)</Label>
          <Input
            id="systolic"
            type="number"
            min="70"
            max="300"
            value={formData.systolic}
            onChange={(e) => handleChange('systolic', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="diastolic">Diastolic (mmHg)</Label>
          <Input
            id="diastolic"
            type="number"
            min="40"
            max="200"
            value={formData.diastolic}
            onChange={(e) => handleChange('diastolic', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="heartRate">Heart Rate (bpm)</Label>
          <Input
            id="heartRate"
            type="number"
            min="30"
            max="250"
            value={formData.heartRate}
            onChange={(e) => handleChange('heartRate', e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="readingDate">Reading Date & Time</Label>
        <Input
          id="readingDate"
          type="datetime-local"
          value={formData.readingDate}
          onChange={(e) => handleChange('readingDate', e.target.value)}
          required
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : (reading ? 'Update' : 'Record')}
        </Button>
      </div>
    </form>
  );
}

function ReadingRow({ reading, onEdit, onDelete }) {
  const StatusIcon = HTN_STATUS_ICONS[reading.htnStatus] || Heart;
  
  return (
    <TableRow>
      <TableCell>
        <div>
          <div className="font-medium">
            {reading.memberName} {reading.memberLastName}
          </div>
          <div className="text-sm text-muted-foreground">
            {reading.employeeId}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-mono text-lg">
          {reading.systolic}/{reading.diastolic}
        </div>
        {reading.heartRate && (
          <div className="text-sm text-muted-foreground">
            HR: {reading.heartRate} bpm
          </div>
        )}
      </TableCell>
      <TableCell>
        <Badge className={HTN_STATUS_COLORS[reading.htnStatus]}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {reading.htnStatus}
        </Badge>
      </TableCell>
      <TableCell>
        {format(new Date(reading.readingDate), 'MMM dd, yyyy HH:mm')}
      </TableCell>
      <TableCell>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(reading)}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(reading)}>
            Delete
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function BloodPressure() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: readings, isLoading } = useQuery({
    queryKey: ['bloodPressure'],
    queryFn: () => bloodPressureAPI.getAll().then(res => res.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => bloodPressureAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bloodPressure'] });
      toast({
        title: 'Reading deleted',
        description: 'Blood pressure reading has been removed successfully.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to delete reading',
        variant: 'destructive',
      });
    },
  });

  const filteredReadings = readings?.filter(reading => {
    return filterStatus === 'all' || reading.htnStatus === filterStatus;
  }) || [];

  const handleEdit = (reading) => {
    setEditingReading(reading);
    setDialogOpen(true);
  };

  const handleDelete = (reading) => {
    if (confirm('Are you sure you want to delete this blood pressure reading?')) {
      deleteMutation.mutate(reading.id);
    }
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingReading(null);
  };

  // Calculate statistics
  const stats = readings?.reduce((acc, reading) => {
    acc.total++;
    acc.statusCounts[reading.htnStatus] = (acc.statusCounts[reading.htnStatus] || 0) + 1;
    acc.totalSystolic += reading.systolic;
    acc.totalDiastolic += reading.diastolic;
    return acc;
  }, {
    total: 0,
    statusCounts: {},
    totalSystolic: 0,
    totalDiastolic: 0
  }) || { total: 0, statusCounts: {}, totalSystolic: 0, totalDiastolic: 0 };

  const avgSystolic = stats.total > 0 ? Math.round(stats.totalSystolic / stats.total) : 0;
  const avgDiastolic = stats.total > 0 ? Math.round(stats.totalDiastolic / stats.total) : 0;

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
          <h1 className="text-3xl font-bold">Blood Pressure Readings</h1>
          <p className="text-muted-foreground">
            Monitor and track blood pressure measurements
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingReading(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Record Reading
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingReading ? 'Edit Reading' : 'Record Blood Pressure'}
              </DialogTitle>
              <DialogDescription>
                {editingReading ? 'Update blood pressure reading' : 'Record a new blood pressure measurement'}
              </DialogDescription>
            </DialogHeader>
            <BloodPressureForm
              reading={editingReading}
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
            <CardTitle className="text-sm font-medium">Total Readings</CardTitle>
            <Heart className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average BP</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSystolic}/{avgDiastolic}</div>
            <p className="text-xs text-muted-foreground">mmHg</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.statusCounts['Stage 2'] || 0) + (stats.statusCounts['Crisis'] || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Stage 2 + Crisis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normal</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.statusCounts['Normal'] || 0}</div>
            <p className="text-xs text-muted-foreground">Healthy readings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-48">
            <Label htmlFor="status">HTN Status</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="Normal">Normal</SelectItem>
                <SelectItem value="Elevated">Elevated</SelectItem>
                <SelectItem value="Stage 1">Stage 1</SelectItem>
                <SelectItem value="Stage 2">Stage 2</SelectItem>
                <SelectItem value="Crisis">Crisis</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Readings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Readings ({filteredReadings.length})</CardTitle>
          <CardDescription>
            Latest blood pressure measurements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Blood Pressure</TableHead>
                <TableHead>HTN Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReadings.map((reading) => (
                <ReadingRow
                  key={reading.id}
                  reading={reading}
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

