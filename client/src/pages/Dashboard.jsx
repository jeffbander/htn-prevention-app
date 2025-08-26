import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Users, 
  Heart, 
  MessageSquare, 
  TrendingUp, 
  AlertTriangle,
  Activity
} from 'lucide-react';
import { analyticsAPI } from '@/services/api';

const COLORS = {
  Normal: '#22c55e',
  Elevated: '#eab308',
  'Stage 1': '#f97316',
  'Stage 2': '#ef4444',
  Crisis: '#dc2626'
};

function MetricCard({ title, value, description, icon: Icon, trend, color = 'blue' }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trend && (
          <div className="flex items-center mt-2">
            <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
            <span className="text-xs text-green-600">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HTNStatusChart({ data }) {
  const chartData = data?.map(item => ({
    name: item.htnStatus,
    value: item.count,
    color: COLORS[item.htnStatus] || '#6b7280'
  })) || [];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>HTN Status Distribution</CardTitle>
        <CardDescription>Current hypertension status across all members</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function UnionChart({ data }) {
  const chartData = data?.map(item => ({
    name: item.union,
    members: item.count
  })) || [];

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Members by Union</CardTitle>
        <CardDescription>Distribution of members across first responder unions</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="members" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest program activities</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">New member registered</p>
              <p className="text-xs text-muted-foreground">John Smith - Firefighters</p>
            </div>
            <Badge variant="secondary">2h ago</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">BP reading recorded</p>
              <p className="text-xs text-muted-foreground">140/90 - Stage 1 HTN</p>
            </div>
            <Badge variant="secondary">4h ago</Badge>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            <div className="flex-1">
              <p className="text-sm font-medium">Follow-up call completed</p>
              <p className="text-xs text-muted-foreground">Member counseling session</p>
            </div>
            <Badge variant="secondary">6h ago</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => analyticsAPI.getOverview().then(res => res.data),
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of the Hypertension Prevention Program
          </p>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const { overview, htnDistribution, unionDistribution } = analytics || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of the Hypertension Prevention Program for First Responders
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Members"
          value={overview?.totalMembers || 0}
          description="Enrolled first responders"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="BP Readings"
          value={overview?.totalReadings || 0}
          description="Total measurements recorded"
          icon={Heart}
          color="red"
        />
        <MetricCard
          title="Encounters"
          value={overview?.totalEncounters || 0}
          description="Communication sessions"
          icon={MessageSquare}
          color="green"
        />
        <MetricCard
          title="Recent Activity"
          value={`${overview?.recentReadings || 0} / ${overview?.recentEncounters || 0}`}
          description="Readings / Encounters (30 days)"
          icon={Activity}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-4">
        <HTNStatusChart data={htnDistribution} />
        <UnionChart data={unionDistribution} />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-3">
        <RecentActivity />
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              High Priority
            </CardTitle>
            <CardDescription>Members requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Crisis Status</span>
                <Badge variant="destructive">
                  {htnDistribution?.find(h => h.htnStatus === 'Crisis')?.count || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Stage 2 HTN</span>
                <Badge variant="secondary">
                  {htnDistribution?.find(h => h.htnStatus === 'Stage 2')?.count || 0}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Overdue Follow-ups</span>
                <Badge variant="outline">3</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Program Impact</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Participation Rate</span>
                <span className="font-medium">85%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Avg BP Improvement</span>
                <span className="font-medium text-green-600">-8/5 mmHg</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Engagement Score</span>
                <span className="font-medium">92%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

