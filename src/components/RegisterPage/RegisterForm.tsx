import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Button, Spinner, InputGroup } from 'react-bootstrap';
import api from '../../services/api';
import { useTranslation } from '../../i18n/useTranslation';

const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [group, setGroup] = useState<number>(1);
  const [sector, setSector] = useState<string>('AZ');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sectorMap: { [key: string]: number } = {
    AZ: 0,
    RU: 1,
    EN: 2,
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setProfilePicture(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    const formData = new FormData();
    formData.append('Username', username);
    formData.append('Password', password);
    formData.append('FirstName', firstName);
    formData.append('LastName', lastName);
    formData.append('Email', email);
    formData.append('PhoneNumber', phoneNumber);
    formData.append('Group', group.toString());
    formData.append('Sector', sectorMap[sector].toString());
    if (profilePicture) {
      formData.append('ProfilePicture', profilePicture);
    }

    try {
      const response = await api.post('/auth/register', formData);
      if (response.status === 201 || response.status === 200) {
        let userId: string | null = null;
        
        if (typeof response.data === 'string' && response.data.includes('User with ID')) {
          const match = response.data.match(/User with ID ([^ ]+)/);
          if (match) {
            userId = match[1];
          }
        }
        
        if (!userId) {
          throw new Error('Could not find user ID in server response');
        }
        
        userId = userId.trim().toLowerCase();
        
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
          throw new Error('Invalid user ID format received from server');
        }
        
        navigate('/verify-email', { state: { userId } });
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        err.response?.data || 
        err.message || 
        t('registrationFailed')
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {error && <div className="text-danger mb-3">{error}</div>}
      <Form onSubmit={handleSubmit}>
        <div className="row">
          {/* Left Column */}
          <div className="col-md-6">
            <Form.Group controlId="username" className="mb-3">
              <Form.Label>{t('username')}</Form.Label>
              <Form.Control
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="password" className="mb-3">
              <Form.Label>{t('password')}</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <Button
                  variant="outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  type="button"
                >
                  {showPassword ? (
                    <i className="bi bi-eye-slash"></i>
                  ) : (
                    <i className="bi bi-eye"></i>
                  )}
                </Button>
              </InputGroup>
            </Form.Group>

            <Form.Group controlId="firstName" className="mb-3">
              <Form.Label>{t('firstName')}</Form.Label>
              <Form.Control
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="lastName" className="mb-3">
              <Form.Label>{t('lastName')}</Form.Label>
              <Form.Control
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </Form.Group>
          </div>

          {/* Right Column */}
          <div className="col-md-6">
            <Form.Group controlId="email" className="mb-3">
              <Form.Label>{t('email')}</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group controlId="phoneNumber" className="mb-3">
              <Form.Label>{t('phoneNumber')}</Form.Label>
              <InputGroup>
                <InputGroup.Text className="bg-light" style={{ padding: '0.375rem 0.75rem' }}>+994</InputGroup.Text>
                <Form.Control
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 9) {
                      setPhoneNumber(value);
                    }
                  }}
                  pattern="[0-9]{9}"
                  maxLength={9}
                  placeholder="XXXXXXXXX"
                  required
                />
              </InputGroup>
              <Form.Text className="text-muted">
                {t('phoneNumberFormat')}
              </Form.Text>
            </Form.Group>

            <Form.Group controlId="group" className="mb-3">
              <Form.Label>{t('group')}</Form.Label>
              <Form.Control
                as="select"
                value={group}
                onChange={(e) => setGroup(Number(e.target.value))}
                required
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="sector" className="mb-3">
              <Form.Label>{t('sector')}</Form.Label>
              <Form.Control
                as="select"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                required
              >
                <option value="AZ">AZ</option>
                <option value="RU">RU</option>
                <option value="EN">EN</option>
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="profilePicture" className="mb-3">
              <Form.Label>{t('profilePicture')}</Form.Label>
              <Form.Control
                type="file"
                onChange={handleFileChange}
              />
            </Form.Group>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-12">
            <Button 
              variant="primary" 
              type="submit" 
              disabled={isLoading}
              className="w-100 d-flex align-items-center justify-content-center gap-2 mb-3"
            >
              {isLoading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                  />
                  <span>{t('registering')}</span>
                </>
              ) : (
                t('register')
              )}
            </Button>
            <div className="text-center">
              <small className="text-muted">
                {t('alreadyHaveAccount')}{' '}
                <Link to="/login" className="text-decoration-none">{t('login')}</Link>
              </small>
            </div>
          </div>
        </div>
      </Form>
    </>
  );
};

export default RegisterForm;