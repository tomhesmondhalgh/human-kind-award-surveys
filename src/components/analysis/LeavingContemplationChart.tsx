
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Lock } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { LEAVING_CONTEMPLATION_OPTIONS, type LeavingContemplationData } from "../../utils/analysisUtils";

interface LeavingContemplationChartProps {
  data: LeavingContemplationData;
  hasAccess: boolean;
}

// Least to most frequent, green to red.
const OPTION_COLOURS: Record<string, string> = {
  "Never": "#00C853",
  "Rarely": "#81C784",
  "Sometimes": "#FFD54F",
  "Often": "#FFA726",
  "All the Time": "#FF5252"
};

// Placeholder national figures (see review item C2), carried over unchanged from
// the old agree/disagree labels onto the matching answers; no national figure
// has ever existed for "All the Time".
const NATIONAL_AVERAGE: Record<string, number> = {
  "Never": 0.25,
  "Rarely": 0.25,
  "Sometimes": 0.40,
  "Often": 0.10,
  "All the Time": 0
};

const LeavingContemplationChart: React.FC<LeavingContemplationChartProps> = ({
  data,
  hasAccess
}) => {
  const toRow = (name: string, values: Record<string, number>) => ({
    name,
    ...Object.fromEntries(LEAVING_CONTEMPLATION_OPTIONS.map(option => [option, values[option] || 0]))
  });

  const chartData = [toRow("Your School", data.proportions)];
  
  if (hasAccess) {
    chartData.push(toRow("National Average", NATIONAL_AVERAGE));
  }
  
  const hasData = data.total > 0;
  
  return (
    <Card className="p-6 h-full">
      <h3 className="text-lg mb-4 font-semibold">Staff Contemplating Leaving</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          {hasData ? <BarChart data={chartData} layout="vertical" stackOffset="expand" barSize={30} margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5
        }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tickFormatter={value => `${(value * 100).toFixed(0)}%`} />
              <YAxis type="category" dataKey="name" width={100} />
              <Tooltip formatter={(value, name) => [`${(Number(value) * 100).toFixed(0)}%`, name]} />
              <Legend wrapperStyle={{
                fontSize: '10px'
              }} iconSize={8} layout="horizontal" verticalAlign="bottom" />
              {LEAVING_CONTEMPLATION_OPTIONS.map(option => (
                <Bar key={option} dataKey={option} stackId="a" fill={OPTION_COLOURS[option]} />
              ))}
            </BarChart> : <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No data available</p>
            </div>}
        </ResponsiveContainer>
      </div>
      {!hasAccess && (
        <div className="mt-4 border border-gray-200 rounded-lg p-3 bg-gray-50 flex items-center">
          <Lock className="h-4 w-4 text-gray-400 mr-2" />
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-700">National Average comparison requires Foundation plan or higher</p>
          </div>
          <Button size="sm" variant="outline" className="text-xs py-1 h-7" onClick={() => window.location.href = '/upgrade'}>
            Upgrade
          </Button>
        </div>
      )}
      <p className="text-xs text-gray-500 text-center mt-2">
        Responses to: "In the last 6 months I have contemplated leaving my role"
      </p>
    </Card>
  );
};

export default LeavingContemplationChart;
