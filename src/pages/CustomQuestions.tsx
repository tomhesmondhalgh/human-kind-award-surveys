
import React from 'react';
import QuestionsPage from '../components/custom-questions/QuestionsPage';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../components/ui/breadcrumb';
import { useNavigate } from 'react-router-dom';

export default function CustomQuestions() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
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
    </div>
  );
}
