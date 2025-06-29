
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  description?: string;
  value?: string | number;
  icon?: LucideIcon;
  children?: React.ReactNode;
  className?: string;
}

export function DashboardCard({ 
  title, 
  description, 
  value, 
  icon: Icon, 
  children, 
  className = "" 
}: DashboardCardProps) {
  return (
    <Card className={`dashboard-card ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          {Icon && <Icon className="w-5 h-5 text-slate-300" />}
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-slate-400">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {value && (
          <div className="text-2xl font-bold text-white mb-4">
            {value}
          </div>
        )}
        {children}
      </CardContent>
    </Card>
  );
}
