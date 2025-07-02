
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

interface CalculatorCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export function CalculatorCard({ title, description, children }: CalculatorCardProps) {
  return (
    <Card className="calculator-theme shine-animation">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Calculator className="w-5 h-5 text-accent-blue" />
          {title}
        </CardTitle>
        <CardDescription className="text-text-secondary">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}
