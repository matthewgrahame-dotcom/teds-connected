import { useState } from 'react';
import { FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/auth';
import { TrainingReportingTab } from '@/components/reporting/TrainingReportingTab';
import { PolicyComplianceTab } from '@/components/reporting/PolicyComplianceTab';

export default function ReportingPage() {
  const { session } = useAuth();
  const canView = session?.level === 'full';
  const [tab, setTab] = useState<'training' | 'compliance'>('training');

  if (!canView) {
    return <div className="px-5 py-10 text-center text-sm text-muted-foreground lg:px-10">You don't have access to this page.</div>;
  }

  return (
    <div className="px-5 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-extrabold text-foreground">Reporting</h1>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'training' | 'compliance')}>
            <TabsList>
              <TabsTrigger value="training">Training</TabsTrigger>
              <TabsTrigger value="compliance">Policy Compliance</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tab === 'training' ? <TrainingReportingTab /> : <PolicyComplianceTab />}
      </div>
    </div>
  );
}
