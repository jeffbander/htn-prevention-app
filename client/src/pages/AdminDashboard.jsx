import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Alert, AlertDescription } from '../components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, Users, Activity, TrendingUp, AlertTriangle, Phone, FileText } from 'lucide-react';

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [dailyReadings, setDailyReadings] = useState(null);
  const [enrollmentMetrics, setEnrollmentMetrics] = useState(null);
  const [activityStats, setActivityStats] = useState(null);
  const [recentReadingsDetailed, setRecentReadingsDetailed] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedUnion, setSelectedUnion] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const UNION_COLORS = {
    'Firefighters': '#FF6B6B',
    'Police': '#4ECDC4',
    'EMS': '#45B7D1'
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchDashboardOverview = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/admin/dashboard-overview', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      } else {
        throw new Error('Failed to fetch dashboard overview');
      }
    } catch (error) {
      setError('Failed to load dashboard overview');
    }
  };

  const fetchDailyReadings = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/admin/daily-readings', {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setDailyReadings(data);
      }
    } catch (error) {
      console.error('Failed to fetch daily readings:', error);
    }
  };

  const fetchEnrollmentMetrics = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`http://localhost:3002/api/admin/enrollment-metrics?startDate=${thirtyDaysAgo}&endDate=${today}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setEnrollmentMetrics(data);
      }
    } catch (error) {
      console.error('Failed to fetch enrollment metrics:', error);
    }
  };

  const fetchActivityStats = async () => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      
      const response = await fetch(`http://localhost:3002/api/admin/activity-stats?startDate=${thirtyDaysAgo}&endDate=${today}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setActivityStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch activity stats:', error);
    }
  };

  const fetchRecentReadingsDetailed = async () => {
    try {
      const response = await fetch(`http://localhost:3002/api/admin/recent-readings-detailed?date=${selectedDate}&union=${selectedUnion}`, {
        headers: getAuthHeaders()
      });
      if (response.ok) {
        const data = await response.json();
        setRecentReadingsDetailed(data);
      }
    } catch (error) {
      console.error('Failed to fetch recent readings detailed:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardOverview(),
        fetchDailyReadings(),
        fetchEnrollmentMetrics(),
        fetchActivityStats()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    fetchRecentReadingsDetailed();
  }, [selectedDate, selectedUnion]);

  const getHTNStatusColor = (status) => {
    switch (status) {
      case 'Normal': return 'bg-green-100 text-green-800';
      case 'Elevated': return 'bg-yellow-100 text-yellow-800';
      case 'Stage 1': return 'bg-orange-100 text-orange-800';
      case 'Stage 2': return 'bg-red-100 text-red-800';
      case 'Crisis': return 'bg-red-600 text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-lg">Loading Super Admin Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <p className="text-gray-600">HTN Prevention Program Overview</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Super Admin
          </Badge>
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
          >
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.membersByUnion.reduce((sum, item) => sum + item.count, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Across all unions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Readings (7d)</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.recentActivity.readings.reduce((sum, item) => sum + item.count, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Blood pressure readings
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Encounters (7d)</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dashboardData.recentActivity.encounters.reduce((sum, item) => sum + item.count, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Communication sessions
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Members</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardData.highRiskMembers.reduce((sum, item) => sum + item.count, 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Stage 2 & Crisis status
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Daily Readings by Union */}
      {dailyReadings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Readings by Union - {dailyReadings.date}
            </CardTitle>
            <CardDescription>
              Blood pressure readings taken today, categorized by HTN status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyReadings.readings}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="union" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="normalCount" stackId="a" fill="#10B981" name="Normal" />
                <Bar dataKey="elevatedCount" stackId="a" fill="#F59E0B" name="Elevated" />
                <Bar dataKey="stage1Count" stackId="a" fill="#EF4444" name="Stage 1" />
                <Bar dataKey="stage2Count" stackId="a" fill="#DC2626" name="Stage 2" />
                <Bar dataKey="crisisCount" stackId="a" fill="#7F1D1D" name="Crisis" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Enrollment Metrics */}
      {enrollmentMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>New Enrollments (Last 30 Days)</CardTitle>
              <CardDescription>
                {enrollmentMetrics.period.startDate} to {enrollmentMetrics.period.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={enrollmentMetrics.newEnrollments}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ union, count }) => `${union}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {enrollmentMetrics.newEnrollments.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={UNION_COLORS[entry.union] || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Enrollments by Union</CardTitle>
              <CardDescription>All-time member enrollment</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={enrollmentMetrics.totalEnrollments}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="union" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Activity Statistics */}
      {activityStats && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Statistics (Last 30 Days)</CardTitle>
            <CardDescription>
              Communication encounters and blood pressure readings by union
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="text-lg font-semibold mb-4">Encounter Statistics</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={activityStats.encounterStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="union" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="totalEncounters" fill="#8884d8" name="Total" />
                    <Bar dataKey="completedEncounters" fill="#82ca9d" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold mb-4">Reading Statistics</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={activityStats.readingStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="union" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="totalReadings" fill="#ffc658" name="Total Readings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Readings Detailed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Readings Details
          </CardTitle>
          <CardDescription>
            Detailed view of blood pressure readings with member information
          </CardDescription>
          <div className="flex gap-4 mt-4">
            <div>
              <label className="text-sm font-medium">Date:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="ml-2 px-3 py-1 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Union:</label>
              <Select value={selectedUnion} onValueChange={setSelectedUnion}>
                <SelectTrigger className="w-40 ml-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Unions</SelectItem>
                  <SelectItem value="Firefighters">Firefighters</SelectItem>
                  <SelectItem value="Police">Police</SelectItem>
                  <SelectItem value="EMS">EMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentReadingsDetailed && recentReadingsDetailed.readings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-2 text-left">Member</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Employee ID</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Union</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">BP Reading</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Heart Rate</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">HTN Status</th>
                    <th className="border border-gray-300 px-4 py-2 text-left">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReadingsDetailed.readings.map((reading) => (
                    <tr key={reading.id} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">
                        {reading.member.firstName} {reading.member.lastName}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {reading.member.employeeId}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <Badge style={{ backgroundColor: UNION_COLORS[reading.member.union] }}>
                          {reading.member.union}
                        </Badge>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {reading.systolic}/{reading.diastolic}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {reading.heartRate || 'N/A'}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <Badge className={getHTNStatusColor(reading.htnStatus)}>
                          {reading.htnStatus}
                        </Badge>
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(reading.readingDate).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No readings found for the selected date and union.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;

