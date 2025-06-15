import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Spinner, Alert } from 'react-bootstrap';
import { Chatbot } from '../components/Dashboard/Chatbot';
import api from '../services/api';
import { getUserIdFromToken } from '../utils/auth';
import { useTranslation } from '../i18n/useTranslation';

interface SubscriptionResponse {
    id: string;
    userId: string;
    packageId: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

interface PackageResponse {
    id: string;
    title: string;
    description: string;
    price: number;
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
    courseIds: string[];
}

interface CourseResponse {
    id: string;
    title: string;
    description: string;
    subject: number;
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
}

interface LessonResponse {
    id: string;
    title: string;
    description: string;
    videoUrl: string;
    order: number;
    transcript?: string;
    imageUrl?: string;
    createdAt: string;
    updatedAt: string;
    courseId: string;
}

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [subscriptions, setSubscriptions] = useState<SubscriptionResponse[]>([]);
    const [packages, setPackages] = useState<PackageResponse[]>([]);
    const [courses, setCourses] = useState<CourseResponse[]>([]);
    const [lessonsMap, setLessonsMap] = useState<Record<string, LessonResponse[]>>({});
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedCourseId, setSelectedCourseId] = useState<string>('');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<LessonResponse | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [selectedCourse, setSelectedCourse] = useState<CourseResponse | null>(null);
    const [expandedPackageId, setExpandedPackageId] = useState<string | null>(null);
    const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
    const [chatbotOpen, setChatbotOpen] = useState(false);

    const userId = getUserIdFromToken();

    useEffect(() => {
        console.log('DashboardPage useEffect triggered with userId:', userId);
        console.log('Dependencies:', { userId, navigate: navigate.toString(), t: t.toString() });
        if (!userId) {
            navigate('/login');
            return;
        }

        const fetchData = async () => {
            try {
                setError(null);
                console.log('Fetching subscriptions for user:', userId);
                
                const subRes = await api.get<SubscriptionResponse[]>(`/subscription/active/${userId}`);
                const subs = subRes.data;
                console.log('Active subscriptions:', subs);
                
                if (subs.length === 0) {
                    setError(t('noActiveSubscription'));
                    setLoading(false);
                    return;
                }
                
                setSubscriptions(subs);

                console.log('Fetching package details...');
                const pkgPromises = subs.map(sub => api.get<PackageResponse>(`/package/${sub.packageId}`));
                const pkgResults = await Promise.all(pkgPromises);
                const pkgs = pkgResults.map(res => res.data);
                console.log('Packages:', pkgs);
                setPackages(pkgs);

                const courseIds = Array.from(new Set(pkgs.flatMap(p => p.courseIds)));
                console.log('Course IDs:', courseIds);
                
                if (courseIds.length === 0) {
                    setError(t('noCoursesInPackages'));
                    setLoading(false);
                    return;
                }

                console.log('Fetching course details...');
                const coursePromises = courseIds.map(cid => api.get<CourseResponse>(`/course/${cid}`));
                const courseResults = await Promise.all(coursePromises);
                const crs = courseResults.map(res => res.data);
                console.log('Courses:', crs);
                setCourses(crs);

                if (crs.length > 0) {
                    setSelectedCourseId(crs[0].id);
                }

                console.log('Fetching lessons...');
                const lessonsMapTemp: Record<string, LessonResponse[]> = {};
                await Promise.all(crs.map(async c => {
                    try {
                        const lessonsRes = await api.get<LessonResponse[]>(`/lesson/course/${c.id}`);
                        const sortedLessons = lessonsRes.data.sort((a, b) => a.order - b.order);
                        lessonsMapTemp[c.id] = sortedLessons;
                        console.log(`Lessons for course ${c.id}:`, sortedLessons);
                    } catch (err) {
                        console.error(`Failed to fetch lessons for course ${c.id}:`, err);
                        lessonsMapTemp[c.id] = [];
                    }
                }));
                setLessonsMap(lessonsMapTemp);
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
                setError(t('failedToLoadCourses'));
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="text-center mt-5">
                <Spinner animation="border" />
                <p className="mt-2">{t('loadingCourses')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <Container className="mt-4">
                <Alert variant="warning">
                    <Alert.Heading>{t('coursesLoadFailed')}</Alert.Heading>
                    <p>{error}</p>
                    {error.includes('subscriptions') && (
                        <Button 
                            variant="primary" 
                            onClick={() => navigate('/packages')}
                            className="mt-2"
                        >
                            {t('viewAvailablePackages')}
                        </Button>
                    )}
                </Alert>
            </Container>
        );
    }

    // Filter unique packages by id
    const uniquePackages = packages.filter((pkg, idx, arr) => arr.findIndex(p => p.id === pkg.id) === idx);

    if (courses.length === 0) {
        return (
            <Container className="mt-4">
                <Alert variant="info">
                    <Alert.Heading>{t('noCoursesAvailable')}</Alert.Heading>
                    <p>{t('noCoursesInPackages')}</p>
                </Alert>
            </Container>
        );
    }

    return (
        <Container fluid className="mt-4">
            <Row>
                {/* Sidebar tree: Packages > Courses > Lessons */}
                <Col md={3} style={{ borderRight: '1px solid #eee', minHeight: '80vh', background: '#fafbfc' }}>
                    <div style={{ padding: '24px 0' }}>
                        <h5 style={{ fontWeight: 700, marginBottom: 24, color: '#c33764' }}>{t('packages')}</h5>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {uniquePackages.map(pkg => (
                                <li key={pkg.id} style={{ marginBottom: 12 }}>
                                    <div
                                        style={{ fontWeight: 600, color: '#222', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                                        onClick={() => {
                                            setExpandedPackageId(expandedPackageId === pkg.id ? null : pkg.id);
                                            setExpandedCourseId(null);
                                        }}
                                    >
                                        <span style={{ fontSize: 18 }}>{expandedPackageId === pkg.id ? '▼' : '▶'}</span>
                                        {pkg.title}
                                    </div>
                                    {expandedPackageId === pkg.id && (
                                        <ul style={{ listStyle: 'none', paddingLeft: 24, marginTop: 8 }}>
                                            {pkg.courseIds.map(courseId => {
                                                const course = courses.find(c => c.id === courseId);
                                                if (!course) return null;
                                                return (
                                                    <li key={courseId} style={{ marginBottom: 8 }}>
                                                        <div
                                                            style={{ fontWeight: 500, color: '#444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                                                            onClick={() => setExpandedCourseId(expandedCourseId === courseId ? null : courseId)}
                                                        >
                                                            <span style={{ fontSize: 16 }}>{expandedCourseId === courseId ? '▼' : '▶'}</span>
                                                            {course.title}
                                                        </div>
                                                        {expandedCourseId === courseId && (
                                                            <ul style={{ listStyle: 'none', paddingLeft: 24, marginTop: 6 }}>
                                                                {(lessonsMap[courseId] || []).map(lesson => (
                                                                    <li
                                                                        key={lesson.id}
                                                                        style={{
                                                                            fontWeight: selectedLesson?.id === lesson.id ? 700 : 400,
                                                                            color: selectedLesson?.id === lesson.id ? '#c33764' : '#222',
                                                                            cursor: 'pointer',
                                                                            marginBottom: 6,
                                                                            background: selectedLesson?.id === lesson.id ? '#f5e1ef' : 'transparent',
                                                                            borderRadius: 8,
                                                                            padding: '6px 10px'
                                                                        }}
                                                                        onClick={() => setSelectedLesson(lesson)}
                                                                    >
                                                                        {lesson.title}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Col>
                {/* Main content area */}
                <Col md={9}>
                    {selectedLesson ? (
                        <div style={{ padding: '32px 0' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: 24 }}>{selectedLesson.title}</h3>
                            {selectedLesson.videoUrl ? (
                                <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 18, marginBottom: 24, overflow: 'hidden', background: '#000' }}>
                                    <video
                                        key={selectedLesson.videoUrl}
                                        controls
                                        preload="metadata"
                                        playsInline
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            height: '100%',
                                            borderRadius: 18,
                                            objectFit: 'contain',
                                            background: '#000'
                                        }}
                                        onError={(e) => {
                                            console.error('Video playback error:', e);
                                            const videoElement = e.target as HTMLVideoElement;
                                            videoElement.style.display = 'none';
                                            const container = videoElement.parentElement;
                                            if (container) {
                                                container.innerHTML = `
                                                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #721c24; font-weight: 600; background: #f8d7da; border-radius: 18px;">
                                                        Video yüklənmədi. Zəhmət olmasa daha sonra yenidən cəhd edin.
                                                        <br/>
                                                        <small>Error: ${(e.target as HTMLVideoElement).error?.message || 'Unknown error'}</small>
                                                    </div>
                                                `;
                                            }
                                        }}
                                    >
                                        <source src={selectedLesson.videoUrl} type="video/mp4" />
                                        <source src={selectedLesson.videoUrl} type="video/webm" />
                                        <source src={selectedLesson.videoUrl} type="video/ogg" />
                                        Your browser does not support the video tag.
                                    </video>
                                </div>
                            ) : (
                                <div style={{ width: '100%', aspectRatio: '16/9', background: '#f8d7da', borderRadius: 18, marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#721c24', fontWeight: 600 }}>
                                    Video mövcud deyil
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center mt-5">
                            <h3>{t('selectLesson')}</h3>
                            <p>{t('selectLessonDescription')}</p>
                        </div>
                    )}
                </Col>
            </Row>
            {/* Floating Chatbot Button and Window */}
            <div style={{ position: 'fixed', bottom: 32, right: 32, zIndex: 9999 }}>
                {selectedLesson && !chatbotOpen && (
                    <button
                        onClick={() => setChatbotOpen(true)}
                        style={{
                            width: 60,
                            height: 60,
                            borderRadius: '50%',
                            background: '#c33764',
                            color: '#fff',
                            border: 'none',
                            boxShadow: '0 4px 16px 0 rgba(31,38,135,0.10)',
                            fontSize: 32,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        aria-label="Open Chatbot"
                    >
                        💬
                    </button>
                )}
                {selectedLesson && chatbotOpen && (
                    <div style={{
                        width: 440,
                        height: 620,
                        background: '#fff',
                        borderRadius: 18,
                        boxShadow: '0 8px 32px 0 rgba(31,38,135,0.18)',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                    }}>
                        <button
                            onClick={() => setChatbotOpen(false)}
                            style={{
                                position: 'absolute',
                                top: 10,
                                right: 10,
                                background: 'transparent',
                                border: 'none',
                                fontSize: 24,
                                color: '#c33764',
                                cursor: 'pointer',
                                zIndex: 2
                            }}
                            aria-label="Close Chatbot"
                        >
                            ×
                        </button>
                        <div style={{ flex: 1, padding: '32px 16px 16px 16px', overflow: 'auto' }}>
                            <Chatbot lessonId={selectedLesson.id} />
                        </div>
                    </div>
                )}
            </div>
        </Container>
    );
};

export default DashboardPage; 