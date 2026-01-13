import { Navigation } from '../components/Navigation';
import { Footer } from '../components/Footer';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Dummy data for charts
const revenueData = [
  { month: 'Jan', revenue: 4200, expenses: 2400 },
  { month: 'Feb', revenue: 5100, expenses: 2800 },
  { month: 'Mar', revenue: 4800, expenses: 2600 },
  { month: 'Apr', revenue: 6300, expenses: 3200 },
  { month: 'May', revenue: 7200, expenses: 3500 },
  { month: 'Jun', revenue: 8100, expenses: 3800 },
];

const userGrowthData = [
  { month: 'Jan', users: 120 },
  { month: 'Feb', users: 185 },
  { month: 'Mar', users: 245 },
  { month: 'Apr', users: 320 },
  { month: 'May', users: 410 },
  { month: 'Jun', users: 520 },
];

const tierDistribution = [
  { name: 'Free', value: 320, color: '#94a3b8' },
  { name: 'Basic', value: 150, color: '#3b82f6' },
  { name: 'Pro', value: 40, color: '#8b5cf6' },
  { name: 'Enterprise', value: 10, color: '#f59e0b' },
];

const activityData = [
  { day: 'Mon', logins: 145, actions: 320 },
  { day: 'Tue', logins: 168, actions: 380 },
  { day: 'Wed', logins: 192, actions: 420 },
  { day: 'Thu', logins: 178, actions: 390 },
  { day: 'Fri', logins: 156, actions: 340 },
  { day: 'Sat', logins: 98, actions: 210 },
  { day: 'Sun', logins: 87, actions: 180 },
];

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: string;
}

function StatCard({ title, value, change, isPositive, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '↑' : '↓'} {change}
      </div>
    </div>
  );
}

export function Analytics() {
  const { t } = useTranslation(['pages', 'common']);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('analytics.title', 'Analytics')}
          </h1>
          <p className="mt-2 text-gray-600">
            {t('analytics.subtitle', 'Track your application performance and user metrics.')}
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t('analytics.stats.totalUsers', 'Total Users')}
            value="520"
            change={t('analytics.stats.totalUsersChange', '12.5% from last month')}
            isPositive={true}
            icon="👥"
          />
          <StatCard
            title={t('analytics.stats.revenue', 'Monthly Revenue')}
            value="$8,100"
            change={t('analytics.stats.revenueChange', '8.3% from last month')}
            isPositive={true}
            icon="💰"
          />
          <StatCard
            title={t('analytics.stats.activeUsers', 'Active Users')}
            value="412"
            change={t('analytics.stats.activeUsersChange', '5.2% from last week')}
            isPositive={true}
            icon="⚡"
          />
          <StatCard
            title={t('analytics.stats.conversion', 'Conversion Rate')}
            value="3.8%"
            change={t('analytics.stats.conversionChange', '0.5% from last month')}
            isPositive={false}
            icon="📈"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('analytics.charts.revenue', 'Revenue & Expenses')}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="expenses"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Expenses"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* User Growth Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('analytics.charts.userGrowth', 'User Growth')}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={userGrowthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="users"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                  name="Users"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tier Distribution Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('analytics.charts.tierDistribution', 'Tier Distribution')}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={tierDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {tierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Activity Chart */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t('analytics.charts.weeklyActivity', 'Weekly Activity')}
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="logins" fill="#3b82f6" name="Logins" />
                <Bar dataKey="actions" fill="#10b981" name="Actions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Developer Note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">
            {t('analytics.devNote.title', 'Developer Note')}
          </h2>
          <p className="text-blue-700">
            {t(
              'analytics.devNote.message',
              'This analytics page displays sample data using Recharts. Replace the dummy data with real metrics from your API to track actual application performance.'
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
