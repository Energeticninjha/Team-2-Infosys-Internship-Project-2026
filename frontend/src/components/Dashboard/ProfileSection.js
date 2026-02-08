import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from '../Common/Card';
import Button from '../Common/Button';

const ProfileSection = ({ userId }) => {
    const [user, setUser] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
    const [photoFile, setPhotoFile] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const uid = userId || sessionStorage.getItem('userId');
        if (uid) {
            fetchUserProfile(uid);
        } else {
            setLoading(false);
        }
    }, [userId]);

    const fetchUserProfile = async (uid) => {
        try {
            const res = await axios.get(`http://localhost:8083/api/users/${uid}`);
            setUser(res.data);
            setFormData({
                name: res.data.name || '',
                phone: res.data.phone || '',
                email: res.data.email || ''
            });
            setPhotoPreview(res.data.profilePhotoUrl || null);
        } catch (error) {
            console.error("Failed to fetch profile", error);
        } finally {
            setLoading(false);
        }
    };

    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            setPhotoFile(file);
            const base64 = await toBase64(file);
            setPhotoPreview(base64);
        }
    };

    const handleSave = async () => {
        try {
            const updates = { ...formData };

            if (photoFile) {
                const base64Photo = await toBase64(photoFile);
                updates.profilePhotoUrl = base64Photo;
            }

            await axios.put(`http://localhost:8083/api/users/${user.id}`, updates);

            alert("Profile updated successfully!");
            setEditMode(false);
            fetchUserProfile(user.id);

            // Update localStorage if name changed
            if (updates.name) {
                localStorage.setItem('name', updates.name);
            }
        } catch (error) {
            console.error("Failed to update profile", error);
            alert("Failed to update profile. Please try again.");
        }
    };

    if (loading) {
        return (
            <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="alert alert-danger">
                Failed to load profile. Please try again later.
            </div>
        );
    }

    return (
        <div className="row g-4 bg-transparent">
            {/* Profile Card */}
            <div className="col-md-4">
                <Card className="text-center h-100">
                    <div className="position-relative d-inline-block mb-3">
                        <img
                            src={photoPreview || "https://randomuser.me/api/portraits/men/32.jpg"}
                            className="rounded-circle shadow-sm"
                            width="120"
                            height="120"
                            style={{ objectFit: 'cover' }}
                            alt="Profile"
                        />
                        {editMode && (
                            <label
                                htmlFor="photoUpload"
                                className="position-absolute bottom-0 end-0 btn btn-primary btn-sm rounded-circle shadow d-flex align-items-center justify-content-center"
                                style={{ width: '36px', height: '36px', padding: '0', cursor: 'pointer' }}
                            >
                                📷
                                <input
                                    id="photoUpload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                    style={{ display: 'none' }}
                                />
                            </label>
                        )}
                    </div>
                    <h4 className="fw-bold mb-1">{user.name}</h4>
                    <span className="badge bg-primary-subtle text-primary px-3 py-2 rounded-pill">
                        {user.role?.toUpperCase()}
                    </span>
                    <div className="mt-3 text-muted small">
                        <div className="mb-1">👤 ID: USR-{user.id}</div>
                        <div>📧 {user.email}</div>
                    </div>
                </Card>
            </div>

            {/* Details Card */}
            <div className="col-md-8">
                <Card noPadding className="h-100">
                    <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 fw-bold">Profile Details</h5>
                        {!editMode ? (
                            <Button variant="primary" className="btn-sm" onClick={() => setEditMode(true)}>
                                ✏️ Edit Profile
                            </Button>
                        ) : (
                            <div className="d-flex gap-2">
                                <Button variant="success" className="btn-sm" onClick={handleSave}>
                                    💾 Save Changes
                                </Button>
                                <Button variant="ghost" className="btn-sm" onClick={() => {
                                    setEditMode(false);
                                    setFormData({
                                        name: user.name || '',
                                        phone: user.phone || '',
                                        email: user.email || ''
                                    });
                                    setPhotoPreview(user.profilePhotoUrl || null);
                                    setPhotoFile(null);
                                }}>
                                    ❌ Cancel
                                </Button>
                            </div>
                        )}
                    </div>
                    <div className="p-4">
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Full Name</label>
                                {editMode ? (
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                ) : (
                                    <div className="p-2 bg-light rounded text-dark">{user.name || 'Not set'}</div>
                                )}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Email Address</label>
                                <div className="p-2 bg-light rounded text-muted">{user.email}</div>
                                <small className="text-muted">Email cannot be changed</small>
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Phone Number</label>
                                {editMode ? (
                                    <input
                                        type="tel"
                                        className="form-control"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="+91 99999 00000"
                                    />
                                ) : (
                                    <div className="p-2 bg-light rounded text-dark">{user.phone || 'Not set'}</div>
                                )}
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold small text-muted">Role</label>
                                <div className="p-2 bg-light rounded text-dark">{user.role?.toUpperCase()}</div>
                            </div>
                        </div>

                        {editMode && (
                            <div className="alert alert-info mt-4 mb-0">
                                <small>
                                    <strong>💡 Tip:</strong> Click the camera icon on your profile photo to upload a new image.
                                </small>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ProfileSection;
