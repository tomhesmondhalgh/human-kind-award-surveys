
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Lock } from "lucide-react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

interface WellbeingQuestionChartProps {
  title: string;
  data: any;
  hasAccess: boolean;
}

const WellbeingQuestionChart: React.FC<WellbeingQuestionChartProps> = ({
  title,
  data,
  hasAccess
}) => {
  const chartData = [{
    name: "Your School",
    "Strongly Disagree": data.schoolResponses?.["Strongly Disagree"] || 0,
    "Disagree": data.schoolResponses?.["Disagree"] || 0,
    "Agree": data.schoolResponses?.["Agree"] || 0,
    "Strongly Agree": data.schoolResponses?.["Strongly Agree"] || 0
  }];
  
  if (hasAccess) {
    chartData.push({
      name: "National Average",
      "Strongly Disagree": data.nationalResponses?.["Strongly Disagree"] || 0,
      "Disagree": data.nationalResponses?.["Disagree"] || 0,
      "Agree": data.nationalResponses?.["Agree"] || 0,
      "Strongly Agree": data.nationalResponses?.["Strongly Agree"] || 0
    });
  }
  
  return (
    <Card className="p-4">
      <h3 className="text-md mb-2 font-semibold my-0 py-[10px]">{title}</h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical" stackOffset="expand" barSize={30} margin={{
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
          </BarChart>
        </ResponsiveContainer>
      </div>
      {!hasAccess && (
        <div className="mt-2 border border-gray-200 rounded-lg p-2 bg-gray-50 flex items-center text-xs">
          <Lock className="h-3 w-3 text-gray-400 mr-1" />
          <span className="text-gray-700">National Average requires Foundation plan</span>
          <Button size="sm" variant="outline" className="text-xs py-0 h-6 ml-auto" onClick={() => window.location.href = '/upgrade'}>
            Upgrade
          </Button>
        </div>
      )}
    </Card>
  );
};

export default WellbeingQuestionChart;
