
import React from 'react';
import MainLayout from '../components/layout/MainLayout';
import PageContainer from '../components/layout/PageContainer';
import QuestionsPage from '../components/custom-questions/QuestionsPage';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../components/ui/breadcrumb';
import { useNavigate, Link } from 'react-router-dom';
import { useSubscription } from '../hooks/useSubscription';
import { Card, CardContent } from '../components/ui/card';
import { Lock } from 'lucide-react';
import { Button } from '../components/ui/button';

export default function CustomQuestions() {
  const navigate = useNavigate();
  const { subscription, isLoading } = useSubscription();

  // Check if user has access to custom questions (Foundation, Progress, or Premium)
  const hasAccess = subscription?.plan && 
    ['foundation', 'legacy', 'progress', 'premium'].includes(subscription.plan) && 
    subscription.isActive;

  if (isLoading) {
    return (
      <MainLayout>
        <PageContainer>
          <div className="flex items-center justify-center min-h-[400px]">
            <p>Loading...</p>
          </div>
        </PageContainer>
      </MainLayout>
    );
  }

  if (!hasAccess) {
    return (
      <MainLayout>
        <PageContainer>
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink onClick={() => navigate(-1)}>Back</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Custom Questions</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Card className="max-w-2xl mx-auto mt-8">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Lock className="h-12 w-12 mx-auto text-muted-foreground" />
                <h2 className="text-xl font-semibold">Custom Questions Available on Paid Plans</h2>
                <p className="text-muted-foreground">
                  Upgrade to Foundation, Progress, or Premium to create and use custom questions in your surveys.
                </p>
                <Link to="/upgrade">
                  <Button className="mt-4">
                    View Plans
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </PageContainer>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageContainer>
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink onClick={() => navigate(-1)}>Back</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Custom Questions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <QuestionsPage />
      </PageContainer>
    </MainLayout>
  );
}
