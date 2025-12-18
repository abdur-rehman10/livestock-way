import { useNavigate } from 'react-router-dom';
import { PostServiceForm } from '../components/service/PostServiceForm';
import type { PostServiceFormValues } from '../components/service/PostServiceForm';
import { createService, uploadServiceImage } from '../api/services';
import { toast } from 'sonner';

export default function PostService() {
  const navigate = useNavigate();

  const handleSubmit = async (values: PostServiceFormValues) => {
    try {
      await createService({
        title: values.serviceName,
        service_type: values.serviceType,
        description: values.description,
        location_name: values.locationName,
        street_address: values.streetAddress,
        city: values.city,
        state: values.state,
        zip: values.zip,
        price_type: values.priceType,
        base_price: values.basePrice ? Number(values.basePrice) : null,
        availability: values.availability,
        response_time: values.responseTime,
        certifications: values.certifications,
        insured: values.insured,
        images: values.images,
      });
      toast.success('Service posted');
      navigate('/stakeholder/dashboard');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message ?? 'Failed to post service');
    }
  };

  return (
    <PostServiceForm
      onCancel={() => navigate(-1)}
      onSubmit={handleSubmit}
      onUploadImage={uploadServiceImage}
    />
  );
}
