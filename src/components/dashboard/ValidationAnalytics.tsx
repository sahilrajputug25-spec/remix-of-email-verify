import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from 'recharts';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

interface ValidationItem {
  id: string;
  email: string;
  status: string;
  created_at: string;
}

interface ValidationAnalyticsProps {
  validations: ValidationItem[];
  loading: boolean;
}

const STATUS_COLORS = {
  valid: 'hsl(var(--success))',
  invalid: 'hsl(var(--destructive))',
  risky: 'hsl(var(--warning))',
};

export default function ValidationAnalytics({ validations, loading }: ValidationAnalyticsProps) {
  const dailyTrends = useMemo(() => {
    if (!validations.length) return [];

    const grouped: Record<string, { date: string; valid: number; invalid: number; risky: number }> = {};

    validations.forEach((v) => {
      const date = new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!grouped[date]) grouped[date] = { date, valid: 0, invalid: 0, risky: 0 };
      if (v.status === 'valid') grouped[date].valid++;
      else if (v.status === 'invalid') grouped[date].invalid++;
      else if (v.status === 'risky') grouped[date].risky++;
    });

    return Object.values(grouped).reverse().slice(-14);
  }, [validations]);

  const pieData = useMemo(() => {
    if (!validations.length) return [];
    const valid = validations.filter((v) => v.status === 'valid').length;
    const invalid = validations.filter((v) => v.status === 'invalid').length;
    const risky = validations.filter((v) => v.status === 'risky').length;
    return [
      { name: 'Valid', value: valid, color: STATUS_COLORS.valid },
      { name: 'Invalid', value: invalid, color: STATUS_COLORS.invalid },
      { name: 'Risky', value: risky, color: STATUS_COLORS.risky },
    ].filter((d) => d.value > 0);
  }, [validations]);

  const successRate = useMemo(() => {
    if (!validations.length) return 0;
    return Math.round((validations.filter((v) => v.status === 'valid').length / validations.length) * 100);
  }, [validations]);

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="shadow-sm"><CardContent className="p-6"><div className="h-64 bg-muted rounded animate-pulse" /></CardContent></Card>
        <Card className="shadow-sm"><CardContent className="p-6"><div className="h-64 bg-muted rounded animate-pulse" /></CardContent></Card>
      </div>
    );
  }

  if (!validations.length) return null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Trends Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="w-4 h-4 text-primary" />
            Validation Trends
          </CardTitle>
          <CardDescription>Daily validation results (last 14 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Area type="monotone" dataKey="valid" stackId="1" stroke={STATUS_COLORS.valid} fill={STATUS_COLORS.valid} fillOpacity={0.6} />
              <Area type="monotone" dataKey="invalid" stackId="1" stroke={STATUS_COLORS.invalid} fill={STATUS_COLORS.invalid} fillOpacity={0.6} />
              <Area type="monotone" dataKey="risky" stackId="1" stroke={STATUS_COLORS.risky} fill={STATUS_COLORS.risky} fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Success Rate Pie */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PieChartIcon className="w-4 h-4 text-primary" />
            Success Rate
          </CardTitle>
          <CardDescription>{successRate}% of emails validated as valid</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
