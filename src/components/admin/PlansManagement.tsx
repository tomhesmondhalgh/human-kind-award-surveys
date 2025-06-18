
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Plus, Edit3, Trash2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { queryTable, insertIntoTable, updateTable, deleteFromTable } from '@/utils/supabaseHelpers';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
  stripe_price_id?: string;
  duration_months?: number;
  purchase_type?: string;
}

const PlansManagement: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const defaultPlan: Partial<Plan> = {
    name: '',
    description: '',
    price: 0,
    currency: 'GBP',
    features: [],
    is_active: true,
    is_popular: false,
    sort_order: 0,
    duration_months: 12,
    purchase_type: 'subscription'
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await queryTable<Plan>('plans', '*');

      if (error) throw error;

      // Sort by sort_order
      const sortedData = (data || []).sort((a, b) => a.sort_order - b.sort_order);
      setPlans(sortedData);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (plan: Plan) => {
    try {
      const planData = {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        features: plan.features,
        is_active: plan.is_active,
        is_popular: plan.is_popular,
        sort_order: plan.sort_order,
        stripe_price_id: plan.stripe_price_id,
        duration_months: plan.duration_months,
        purchase_type: plan.purchase_type
      };

      if (plan.id) {
        // Update existing plan
        const { error } = await updateTable('plans', planData, plan.id);
        if (error) throw error;
        toast.success('Plan updated successfully');
      } else {
        // Create new plan
        const { error } = await insertIntoTable('plans', planData);
        if (error) throw error;
        toast.success('Plan created successfully');
      }

      setEditingPlan(null);
      setIsCreating(false);
      fetchPlans();
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const { error } = await deleteFromTable('plans', planId);
      if (error) throw error;

      toast.success('Plan deleted successfully');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const startEditing = (plan: Plan) => {
    setEditingPlan({ ...plan });
    setIsCreating(false);
  };

  const startCreating = () => {
    setEditingPlan({ ...defaultPlan, id: '' } as Plan);
    setIsCreating(true);
  };

  const cancelEditing = () => {
    setEditingPlan(null);
    setIsCreating(false);
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading plans...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Plans Management</h2>
          <p className="text-gray-600">Manage subscription plans and pricing</p>
        </div>
        <Button onClick={startCreating} disabled={!!editingPlan}>
          <Plus className="h-4 w-4 mr-2" />
          Add Plan
        </Button>
      </div>

      {editingPlan && (
        <Card>
          <CardHeader>
            <CardTitle>{isCreating ? 'Create New Plan' : 'Edit Plan'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingPlan.description}
                onChange={(e) => setEditingPlan({ ...editingPlan, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  value={editingPlan.currency}
                  onChange={(e) => setEditingPlan({ ...editingPlan, currency: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={editingPlan.sort_order}
                  onChange={(e) => setEditingPlan({ ...editingPlan, sort_order: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={editingPlan.is_active}
                  onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, is_active: checked })}
                />
                <Label htmlFor="is_active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_popular"
                  checked={editingPlan.is_popular}
                  onCheckedChange={(checked) => setEditingPlan({ ...editingPlan, is_popular: checked })}
                />
                <Label htmlFor="is_popular">Popular</Label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={cancelEditing}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={() => handleSave(editingPlan)}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {plan.is_popular && <Badge variant="secondary">Popular</Badge>}
                    {!plan.is_active && <Badge variant="outline">Inactive</Badge>}
                  </CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => startEditing(plan)}
                    disabled={!!editingPlan}
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(plan.id)}
                    disabled={!!editingPlan}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold">
                    {plan.currency} {plan.price}
                    {plan.duration_months && (
                      <span className="text-sm font-normal text-gray-600">
                        /{plan.duration_months} months
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">Sort order: {plan.sort_order}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    Features: {Array.isArray(plan.features) ? plan.features.length : 0}
                  </p>
                  {plan.stripe_price_id && (
                    <p className="text-xs text-gray-500">Stripe: {plan.stripe_price_id}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlansManagement;
