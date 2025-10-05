import React from 'react';
// import axios from 'axios';
// import { AuthContext } from '../context/AuthContext';
import ForumFeed from '../components/ForumFeed';
// import { apiUrl } from '../utils/api';
// import '../css/CreateForum.css';

const CreateForum = () => {
  // const {  } = useContext(AuthContext); // assumes user object has region & constituency
  // const [form, setForm] = useState({
  //   title: '',
  //   description: '',
  //   image: '',
  // });
  // const [loading, setLoading] = useState(false);
  // const [error, setError] = useState('');
  // const [success, setSuccess] = useState('');

  // const handleChange = (e) => {
  //   const { name, value, files } = e.target;
  //   if (name === 'image') {
  //     setForm({ ...form, image: files[0] });
  //   } else {
  //     setForm({ ...form, [name]: value });
  //   }
  // };

//  const handleSubmit = async (e) => {
//   e.preventDefault();
//   setError('');
//   setSuccess('');
//   // setLoading(true);

//   try {
//     const formData = new FormData();
//     console.log('User region:', user.region);
//     console.log('User object:', user);
//     console.log('User district:', user.district);
//     formData.append('title', form.title);
//     formData.append('description', form.description);
//     formData.append('region', user.region);
//     formData.append('district', user.district);
//     formData.append('createdBy', user.id); // assuming user object has id
//     formData.append('createdBy', user?._id || user?.id); // ✅ Include creator (supports both _id and id)


//     if (form.image) {
//       formData.append('image', form.image);
//     }

//    await axios.post(apiUrl('/api/forums'), formData, {
//       headers: { 'Content-Type': 'multipart/form-data' }
//     });

//     setSuccess('Forum created successfully');
//     setForm({ title: '', description: '', image: null });
//   } catch (err) {
//     const msg = err.response?.data?.error || err.message || 'Failed to create forum';
//     setError(msg);
//   } finally {
    // setLoading(false)
  //   }
  // };

  return (
    
    <div className="create-forum-container">
      <ForumFeed/>

      {/* <h2>Create a Civic Forum</h2>
        <br></br> */}


      {/* {error && <div className="error-message">{typeof error === 'string' ? error : error.message}</div>}
      {success && <div className="success-message">{success}</div>} */}
{/* 
      <form onSubmit={handleSubmit} className="forum-form">
        <div className="form-group">
          <label>Title</label>
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            required
            placeholder="Forum title"
          />
        </div>

        <div className="form-group">
          <label>Description (optional)</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Brief description"
          />
        </div>

        <div className="form-group">
          <label>Upload Photo (optional)</label>
          <input
            type="file"
            name="image"
            accept="image/*"
            onChange={handleChange}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Forum'}
        </button>
      </form> */}


    </div>
  );
};

export default CreateForum;
