import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Heart, 
  MessageSquare, 
  Target,
  Activity,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { analyticsAPI } from '@/services/api';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];
const HTN_COLORS = {
  Normal: '#22c55e',
  Elevated: '#eab308',
  'Stage 1': '#f97316',
  'Stage 2': '#ef4444',
  Crisis: '#dc2626'
};

function MetricCard({ title, value, description, icon: Icon, trend, trendValue, color = 'blue' }) {
  const TrendIcon = trend === 'up' ? TrendingUp : TrendingDown;
  const trendColor = trend === 'up' ? 'text-green-600' : 'text-red-600';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 text-${color}-600`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
        {trendValue && (
          <div className="flex items-center mt-2">
            <TrendIcon className={`h-3 w-3 ${trendColor} mr-1`} />
            <span className={`text-xs ${trendColor}`}>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewTab({ data }) {
  const { overview, htnDistribution, unionDistribution } = data || {};

  const htnChartData = htnDistribution?.map(item => ({
    name: item.htnStatus,
    value: item.count,
    color: HTN_COLORS[item.htnStatus] || '#6b7280'
  })) || [];

  const unionChartData = unionDistribution?.map(item => ({
    name: item.union,
    members: item.count
  })) || [];

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Members"
          value={overview?.totalMembers || 0}
          description="Enrolled participants"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="BP Readings"
          value={overview?.totalReadings || 0}
          description="Total measurements"
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
          value={`${overview?.recentReadings || 0}/${overview?.recentEncounters || 0}`}
          description="30-day readings/encounters"
          icon={Activity}
          color="purple"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>HTN Status Distribution</CardTitle>
            <CardDescription>Current hypertension status across all members</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={htnChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {htnChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members by Union</CardTitle>
            <CardDescription>Distribution across first responder unions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={unionChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="members" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ClinicalTab({ data }) {
  const { htnStatusDistribution, averageBloodPressure, riskCategories } = data || {};

  const riskData = riskCategories ? [
    { name: 'Low Risk', value: riskCategories.lowRisk, color: '#22c55e' },
    { name: 'Moderate Risk', value: riskCategories.moderateRisk, color: '#f59e0b' },
    { name: 'High Risk', value: riskCategories.highRisk, color: '#ef4444' }
  ] : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Average Systolic"
          value={`${averageBloodPressure?.systolic || 0} mmHg`}
          description="Population average"
          icon={Heart}
          color="red"
        />
        <MetricCard
          title="Average Diastolic"
          value={`${averageBloodPressure?.diastolic || 0} mmHg`}
          description="Population average"
          icon={Heart}
          color="red"
        />
        <MetricCard
          title="High Risk Members"
          value={riskCategories?.highRisk || 0}
          description="Stage 2 + Crisis"
          icon={AlertTriangle}
          color="red"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Risk Categories</CardTitle>
            <CardDescription>Members by cardiovascular risk level</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>HTN Status Breakdown</CardTitle>
            <CardDescription>Detailed hypertension classification</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(htnStatusDistribution || {}).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: HTN_COLORS[status] }}
                    />
                    <span className="text-sm font-medium">{status}</span>
                  </div>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function EngagementTab({ data }) {
  const { communicationTypes, encounterStatus, monthlyTrends } = data || {};

  const commTypeData = communicationTypes?.map(item => ({
    name: item.type,
    count: item.count
  })) || [];

  const statusData = encounterStatus?.map(item => ({
    name: item.isCompleted ? 'Completed' : 'Pending',
    value: item.count,
    color: item.isCompleted ? '#22c55e' : '#f59e0b'
  })) || [];

  const trendsData = monthlyTrends?.map(item => ({
    month: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    encounters: item.count
  })) || [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="Total Communications"
          value={communicationTypes?.reduce((sum, item) => sum + item.count, 0) || 0}
          description="All encounter types"
          icon={MessageSquare}
          color="blue"
        />
        <MetricCard
          title="Completion Rate"
          value={`${statusData.length > 0 ? Math.round((statusData.find(s => s.name === 'Completed')?.value || 0) / statusData.reduce((sum, s) => sum + s.value, 0) * 100) : 0}%`}
          description="Encounters completed"
          icon={CheckCircle}
          color="green"
        />
        <MetricCard
          title="Monthly Average"
          value={trendsData.length > 0 ? Math.round(trendsData.reduce((sum, t) => sum + t.encounters, 0) / trendsData.length) : 0}
          description="Encounters per month"
          icon={Target}
          color="purple"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Communication Types</CardTitle>
            <CardDescription>Distribution of communication methods</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={commTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Encounter Status</CardTitle>
            <CardDescription>Completion status of encounters</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {trendsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Encounter Trends</CardTitle>
            <CardDescription>Encounter volume over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="encounters" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ImpactTab({ data }) {
  const { participationRate, membersWithMultipleReadings, totalActiveMembers, totalMembers } = data || {};

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          title="Participation Rate"
          value={`${participationRate || 0}%`}
          description="Members with readings"
          icon={Users}
          color="blue"
        />
        <MetricCard
          title="Active Members"
          value={totalActiveMembers || 0}
          description="With BP readings"
          icon={Activity}
          color="green"
        />
        <MetricCard
          title="Repeat Participants"
          value={membersWithMultipleReadings || 0}
          description="Multiple readings"
          icon={Target}
          color="purple"
        />
        <MetricCard
          title="Engagement Score"
          value={totalMembers > 0 ? `${Math.round((totalActiveMembers / totalMembers) * 100)}%` : '0%'}
          description="Overall engagement"
          icon={TrendingUp}
          color="orange"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Program Impact Summary</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Enrolled</span>
                <Badge variant="outline">{totalMembers || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active Participants</span>
                <Badge variant="default">{totalActiveMembers || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Repeat Participants</span>
                <Badge variant="secondary">{membersWithMultipleReadings || 0}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Participation Rate</span>
                <Badge className="bg-green-100 text-green-800">{participationRate || 0}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Program Goals</CardTitle>
            <CardDescription>Progress toward objectives</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Participation Target (80%)</span>
                  <span>{participationRate || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((participationRate || 0) / 80 * 100, 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Engagement Target (75%)</span>
                  <span>{totalMembers > 0 ? Math.round((totalActiveMembers / totalMembers) * 100) : 0}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full" 
                    style={{ width: `${Math.min((totalMembers > 0 ? (totalActiveMembers / totalMembers) * 100 : 0) / 75 * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsAPI.getOverview().then(res => res.data),
  });

  const { data: clinical, isLoading: clinicalLoading } = useQuery({
    queryKey: ['analytics', 'clinical'],
    queryFn: () => analyticsAPI.getClinical().then(res => res.data),
  });

  const { data: engagement, isLoading: engagementLoading } = useQuery({
    queryKey: ['analytics', 'engagement'],
    queryFn: () => analyticsAPI.getEngagement().then(res => res.data),
  });

  const { data: impact, isLoading: impactLoading } = useQuery({
    queryKey: ['analytics', 'impact'],
    queryFn: () => analyticsAPI.getImpact().then(res => res.data),
  });

  const isLoading = overviewLoading || clinicalLoading || engagementLoading || impactLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into the Hypertension Prevention Program
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clinical">Clinical</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="impact">Impact</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab data={overview} />
        </TabsContent>

        <TabsContent value="clinical">
          <ClinicalTab data={clinical} />
        </TabsContent>

        <TabsContent value="engagement">
          <EngagementTab data={engagement} />
        </TabsContent>

        <TabsContent value="impact">
          <ImpactTab data={impact} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

