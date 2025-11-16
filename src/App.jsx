import React, { useState, useEffect, createContext, useContext } from 'react';
import './App.css';

// API Configuration
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Auth Context
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// API Helper
const api = {
  async fetch(endpoint, options = {}) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
    }
    return res.json();
  },
  
  async uploadFile(endpoint, formData) {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }
};

// Form Validator
const validator = {
  required: (value, fieldName = 'Field') => {
    if (!value || value.trim() === '') return `${fieldName} is required`;
    return null;
  },
  minLength: (value, min, fieldName = 'Field') => {
    if (value.length < min) return `${fieldName} must be at least ${min} characters`;
    return null;
  },
  maxLength: (value, max, fieldName = 'Field') => {
    if (value.length > max) return `${fieldName} must be less than ${max} characters`;
    return null;
  },
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) return 'Please enter a valid email address';
    return null;
  },
  username: (value) => {
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
      return 'Username must be 3-20 characters (letters, numbers, underscore only)';
    }
    return null;
  },
  password: (value) => {
    if (value.length < 6) return 'Password must be at least 6 characters';
    return null;
  }
};

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await api.fetch('/auth/me');
      setUser(data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    console.log('Attempting login with:', { username, password: '***' });
    const data = await api.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    console.log('Login successful:', data);
    setUser(data.user);
    return data;
  };

  const signup = async (username, email, password, name) => {
    const data = await api.fetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, name }),
    });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await api.fetch('/auth/logout', { method: 'POST' });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser: checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

// Sign In Page
const SignInPage = () => {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ username: '', email: '', password: '', name: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  const validate = () => {
    const newErrors = {};
    
    const usernameError = validator.required(formData.username, 'Username') || validator.username(formData.username);
    if (usernameError) newErrors.username = usernameError;
    
    const passwordError = validator.required(formData.password, 'Password') || validator.password(formData.password);
    if (passwordError) newErrors.password = passwordError;
    
    if (mode === 'signup') {
      const nameError = validator.required(formData.name, 'Name');
      if (nameError) newErrors.name = nameError;
      
      const emailError = validator.required(formData.email, 'Email') || validator.email(formData.email);
      if (emailError) newErrors.email = emailError;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(formData.username, formData.password);
      } else {
        await signup(formData.username, formData.email, formData.password, formData.name);
      }
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Social App</h1>
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Log In
          </button>
          <button 
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="auth-form-container">
          <div className="auth-form-content">
            {apiError && <div className="error-message">{apiError}</div>}
            
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className={errors.username ? 'error' : ''}
              />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>

            {mode === 'signup' && (
              <>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={errors.email ? 'error' : ''}
                  />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>
                
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={errors.name ? 'error' : ''}
                  />
                  {errors.name && <span className="field-error">{errors.name}</span>}
                </div>
              </>
            )}

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={errors.password ? 'error' : ''}
              />
              {errors.password && <span className="field-error">{errors.password}</span>}
            </div>

            <button 
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Navigation Component
const Navigation = () => {
  const { user, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('feed');

  return (
    <>
      <nav className="navbar">
        <div className="nav-content">
          <h2 className="nav-logo">Social App</h2>
          <div className="nav-links">
            <button onClick={() => setCurrentPage('feed')} className={currentPage === 'feed' ? 'active' : ''}>Feed</button>
            <button onClick={() => setCurrentPage('users')} className={currentPage === 'users' ? 'active' : ''}>Users</button>
            <button onClick={() => setCurrentPage('profile')} className={currentPage === 'profile' ? 'active' : ''}>Profile</button>
            <button onClick={logout} className="btn-logout">Logout</button>
          </div>
        </div>
      </nav>
      <div className="main-content">
        {currentPage === 'feed' && <FeedPage />}
        {currentPage === 'users' && <UsersPage />}
        {currentPage === 'profile' && <ProfilePage userId={user.id} />}
      </div>
    </>
  );
};

// Post Component
const Post = ({ post, onUpdate }) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');
  const [showComments, setShowComments] = useState(false);

  const isLiked = post.likes?.some(like => like.user?.id === user.id || like.userId === user.id);

  const handleLike = async () => {
    try {
      if (isLiked) {
        await api.fetch(`/likes/${post.id}`, { method: 'DELETE' });
      } else {
        await api.fetch(`/likes/${post.id}`, { method: 'POST' });
      }
      onUpdate && onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      await api.fetch(`/comments/${post.id}`, {
        method: 'POST',
        body: JSON.stringify({ content: comment }),
      });
      setComment('');
      onUpdate && onUpdate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <img 
          src={post.author?.imageUrl || `https://ui-avatars.com/api/?name=${post.author?.name || 'User'}&background=random`} 
          alt={post.author?.name || 'User'}
          className="avatar-small"
        />
        <div>
          <div className="post-author">{post.author?.name || 'Unknown User'}</div>
          <div className="post-meta">@{post.author?.username || 'unknown'}</div>
        </div>
      </div>
      
      <p className="post-content">{post.content}</p>
      {post.imageUrl && <img src={post.imageUrl} alt="Post" className="post-image" />}
      
      <div className="post-actions">
        <button onClick={handleLike} className={`action-btn ${isLiked ? 'liked' : ''}`}>
          ❤️ {post.likes?.length || 0}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="action-btn">
          💬 {post.comments?.length || 0}
        </button>
      </div>

      {showComments && (
        <div className="comments-section">
          {post.comments?.map(c => (
            <div key={c.id} className="comment">
              <img 
                src={c.author?.imageUrl || `https://ui-avatars.com/api/?name=${c.author?.username || 'User'}&background=random`}
                alt={c.author?.username || 'User'}
                className="avatar-tiny"
              />
              <div className="comment-content">
                <strong>@{c.author?.username || 'unknown'}</strong>
                <p>{c.content}</p>
              </div>
            </div>
          ))}
          
          <form onSubmit={handleComment} className="comment-form">
            <input
              type="text"
              placeholder="Write a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button type="submit" className="btn-primary">Post</button>
          </form>
        </div>
      )}
    </div>
  );
};

// Feed Page
const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFeed();
  }, []);

  const loadFeed = async () => {
    try {
      const data = await api.fetch('/posts/feed');
      setPosts(data.posts);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    
    setLoading(true);
    try {
      await api.fetch('/posts', {
        method: 'POST',
        body: JSON.stringify({ content: newPost }),
      });
      setNewPost('');
      await loadFeed();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="create-post">
        <h2>Create Post</h2>
        <form onSubmit={handleCreatePost}>
          <textarea
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows="3"
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Posting...' : 'Post'}
          </button>
        </form>
      </div>

      <div className="posts-list">
        {posts.map(post => (
          <Post key={post.id} post={post} onUpdate={loadFeed} />
        ))}
        {posts.length === 0 && (
          <div className="empty-state">No posts yet. Follow some users to see their posts!</div>
        )}
      </div>
    </div>
  );
};

// Users Page
const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.fetch('/users');
      setUsers(data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFollow = async (userId) => {
    try {
      await api.fetch(`/follows/${userId}`, { method: 'POST' });
      alert('Follow request sent!');
      await loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page-container">
      <h2>All Users</h2>
      <div className="users-grid">
        {users.filter(u => u.id !== user.id).map(u => (
          <div key={u.id} className="user-card">
            <img 
              src={u.imageUrl || `https://ui-avatars.com/api/?name=${u.name}&background=random`}
              alt={u.name}
              className="avatar-medium"
            />
            <h3>{u.name}</h3>
            <p className="user-username">@{u.username}</p>
            {u.bio && <p className="user-bio">{u.bio}</p>}
            <button onClick={() => handleFollow(u.id)} className="btn-primary">
              Follow
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Profile Page
const ProfilePage = ({ userId }) => {
  const { user: currentUser, refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ name: '', bio: '' });

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    try {
      const data = await api.fetch(`/users/${userId || currentUser.id}`);
      setProfile(data.user);
      setFormData({ name: data.user.name || '', bio: data.user.bio || '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      await api.fetch('/users/me', {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      setEditing(false);
      await loadProfile();
      await refreshUser();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);

    try {
      await api.uploadFile('/users/me/photo', formData);
      await loadProfile();
      await refreshUser();
    } catch (err) {
      console.error(err);
    }
  };

  if (!profile) return <div className="loading">Loading...</div>;

  const isOwnProfile = profile.id === currentUser.id;

  return (
    <div className="page-container">
      <div className="profile-header">
        <div className="profile-avatar-container">
          <img 
            src={profile.imageUrl || `https://ui-avatars.com/api/?name=${profile.name}&background=random&size=200`}
            alt={profile.name}
            className="avatar-large"
          />
          {isOwnProfile && (
            <label className="avatar-upload">
              <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
              <span>Change Photo</span>
            </label>
          )}
        </div>
        
        <div className="profile-info">
          {!editing ? (
            <>
              <h1>{profile.name}</h1>
              <p className="profile-username">@{profile.username}</p>
              {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              {isOwnProfile && (
                <button onClick={() => setEditing(true)} className="btn-primary">
                  Edit Profile
                </button>
              )}
            </>
          ) : (
            <form onSubmit={handleUpdateProfile} className="edit-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows="3"
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-primary">Save</button>
                <button type="button" onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="profile-posts">
        <h2>Posts</h2>
        {profile.posts?.map(post => (
          <Post key={post.id} post={{ ...post, author: profile }} onUpdate={loadProfile} />
        ))}
        {(!profile.posts || profile.posts.length === 0) && (
          <div className="empty-state">No posts yet</div>
        )}
      </div>
    </div>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return <SignInPage />;
  }

  return <Navigation />;
}

export default App;