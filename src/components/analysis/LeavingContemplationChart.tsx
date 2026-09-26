
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Lock } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

interface LeavingContemplationChartProps {
  data: Record<string, number>;
  hasAccess: boolean;
}

const LeavingContemplationChart: React.FC<LeavingContemplationChartProps> = ({
  data,
  hasAccess
}) => {
  const chartData = [{
    name: "Your School",
    "Strongly Disagree": data["Strongly Disagree"] || 0,
    "Disagree": data["Disagree"] || 0,
    "Agree": data["Agree"] || 0,
    "Strongly Agree": data["Strongly Agree"] || 0
  }];
  
  if (hasAccess) {
    chartData.push({
      name: "National Average",
      "Strongly Disagree": 0.25,
      "Disagree": 0.25,
      "Agree": 0.40,
      "Strongly Agree": 0.10
    });
  }
  
  const hasData = Object.values(data).some(val => val > 0);
  
  return (
    <Card className="p-6 h-full">
      <h3 className="text-lg mb-4 font-semibold">Staff Contemplating Leaving</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          {hasData ? <BarChart data={chartData} layout="vertical" barSize={30} margin={{
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
              <Bar dataKey="Strongly Disagree" stackId="a" fill="#FF5252" />
              <Bar dataKey="Disagree" stackId="a" fill="#FFA726" />
              <Bar dataKey="Agree" stackId="a" fill="#81C784" />
              <Bar dataKey="Strongly Agree" stackId="a" fill="#00C853" />
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
        Responses to: "I have considered leaving this organization in the past year"
      </p>
    </Card>
  );
};

export default LeavingContemplationChart;
