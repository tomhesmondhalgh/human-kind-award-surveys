import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { fixPlanTypes } from '@/utils/typeConversions';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  features: string[];
  is_popular: boolean;
  stripe_price_id?: string;
  purchase_type?: string;
  duration_months?: number;
  sort_order: number;
}

const PlansManagement = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [newPlan, setNewPlan] = useState<Omit<Plan, 'id'>>({
    name: '',
    description: '',
    price: 0,
    features: [],
    is_popular: false,
    sort_order: 0
  });
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) {
        throw error;
      }

      // Use the type conversion utility to fix Json[] → string[] conversion
      const transformedPlans = fixPlanTypes(data || []);
      setPlans(transformedPlans);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewPlan(prev => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (index: number, value: string) => {
    const updatedFeatures = [...newPlan.features];
    updatedFeatures[index] = value;
    setNewPlan(prev => ({ ...prev, features: updatedFeatures }));
  };

  const addFeature = () => {
    setNewPlan(prev => ({ ...prev, features: [...prev.features, ''] }));
  };

  const removeFeature = (index: number) => {
    const updatedFeatures = [...newPlan.features];
    updatedFeatures.splice(index, 1);
    setNewPlan(prev => ({ ...prev, features: updatedFeatures }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setNewPlan(prev => ({ ...prev, [name]: checked }));
  };

  const createPlan = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('plans')
        .insert([newPlan])
        .select();

      if (error) {
        throw error;
      }

      // Use the type conversion utility to fix Json[] → string[] conversion
      const transformedData = fixPlanTypes(data || []);
      setPlans([...plans, ...transformedData]);
      setNewPlan({
        name: '',
        description: '',
        price: 0,
        features: [],
        is_popular: false,
        sort_order: 0
      });
      toast.success('Plan created successfully');
    } catch (error: any) {
      console.error('Error creating plan:', error);
      toast.error('Failed to create plan');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (planId: string) => {
    setEditingPlanId(planId);
    const planToEdit = plans.find(plan => plan.id === planId);
    if (planToEdit) {
      setNewPlan({
        name: planToEdit.name,
        description: planToEdit.description,
        price: planToEdit.price,
        features: planToEdit.features,
        is_popular: planToEdit.is_popular,
        sort_order: planToEdit.sort_order
      });
    }
  };

  const cancelEditing = () => {
    setEditingPlanId(null);
    setNewPlan({
      name: '',
      description: '',
      price: 0,
      features: [],
      is_popular: false,
      sort_order: 0
    });
  };

  const updatePlan = async () => {
    if (!editingPlanId) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('plans')
        .update(newPlan)
        .eq('id', editingPlanId);

      if (error) {
        throw error;
      }

      setPlans(plans.map(plan => plan.id === editingPlanId ? { ...plan, ...newPlan } : plan));
      setEditingPlanId(null);
      setNewPlan({
        name: '',
        description: '',
        price: 0,
        features: [],
        is_popular: false,
        sort_order: 0
      });
      toast.success('Plan updated successfully');
    } catch (error: any) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update plan');
    } finally {
      setLoading(false);
    }
  };

  const deletePlan = async (planId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) {
        throw error;
      }

      setPlans(plans.filter(plan => plan.id !== planId));
      toast.success('Plan deleted successfully');
    } catch (error: any) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle>Manage Plans</CardTitle>
          <CardDescription>Create, edit, and manage subscription plans</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  type="text"
                  id="name"
                  name="name"
                  value={newPlan.name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  type="number"
                  id="price"
                  name="price"
                  value={newPlan.price}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                type="text"
                id="description"
                name="description"
                value={newPlan.description}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <Label>Features</Label>
              {newPlan.features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <Input
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    className="flex-grow"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeFeature(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="secondary" size="sm" onClick={addFeature}>
                Add Feature
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Label htmlFor="is_popular">Is Popular</Label>
              <Input
                type="checkbox"
                id="is_popular"
                name="is_popular"
                checked={newPlan.is_popular}
                onChange={handleCheckboxChange}
              />
            </div>
            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                type="number"
                id="sort_order"
                name="sort_order"
                value={newPlan.sort_order}
                onChange={handleInputChange}
              />
            </div>
            {editingPlanId ? (
              <div className="flex justify-end space-x-2">
                <Button variant="ghost" onClick={cancelEditing}>
                  Cancel
                </Button>
                <Button onClick={updatePlan} disabled={loading}>
                  Update Plan
                </Button>
              </div>
            ) : (
              <Button onClick={createPlan} disabled={loading}>
                Create Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Current Plans</CardTitle>
          <CardDescription>View and manage existing subscription plans</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-4">Loading plans...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Popular</TableHead>
                    <TableHead>Sort Order</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map(plan => (
                    <TableRow key={plan.id}>
                      <TableCell>{plan.name}</TableCell>
                      <TableCell>{plan.price}</TableCell>
                      <TableCell>
                        {plan.is_popular ? <Badge>Yes</Badge> : <Badge variant="outline">No</Badge>}
                      </TableCell>
                      <TableCell>{plan.sort_order}</TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="sm" onClick={() => startEditing(plan.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" size="sm" onClick={() => deletePlan(plan.id)}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlansManagement;
