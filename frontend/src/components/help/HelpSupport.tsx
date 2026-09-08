"use client";

import { useMemo, useState, useRef, type FormEvent } from "react";

const FAQS = [
  {
    question: "How do I create a new project?",
    answer:
      "Click the New Project button from the dashboard, enter your project name, and continue to upload your video.",
  },
  {
    question: "How do I upload a video?",
    answer:
      "Open a project, choose the video upload option, select a video file, and continue to the editor.",
  },
  {
    question: "How do I open the video editor?",
    answer:
      "After selecting a valid video file, click Continue to Editor to open the editing workspace.",
  },
];

const STEPS = [
  {
    number: 1,
    title: "Create a Project",
    description: "Start a new project from the ClipCraft dashboard.",
  },
  {
    number: 2,
    title: "Upload Your Video",
    description: "Select your video file and upload it to your project.",
  },
  {
    number: 3,
    title: "Open the Editor",
    description: "Continue to the editor and start working on your video.",
  },
  {
    number: 4,
    title: "Edit Your Video",
    description: "Use the editing workspace to make changes to your video.",
  },
  {
    number: 5,
    title: "Export Your Work",
    description: "Complete your editing and continue to the output stage.",
  },
];

type FormErrors = {
  name?: string;
  email?: string;
  message?: string;
};

export default function HelpSupport() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const formWrapperRef = useRef<HTMLDivElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const term = searchTerm.trim().toLowerCase();

  const visibleFaqs = useMemo(() => {
    if (!term) return FAQS.map((faq, index) => ({ faq, index }));
    return FAQS.map((faq, index) => ({ faq, index })).filter(
      ({ faq }) =>
        faq.question.toLowerCase().includes(term) || faq.answer.toLowerCase().includes(term),
    );
  }, [term]);

  const noResults = term.length > 0 && visibleFaqs.length === 0;

  function toggleFaq(index: number) {
    setOpenIndex((current) => (current === index ? null : index));
  }

  function openSupportForm() {
    setShowForm(true);
    setShowSuccess(false);
    requestAnimationFrame(() => {
      formWrapperRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      nameRef.current?.focus();
    });
  }

  function closeSupportForm() {
    setShowForm(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedMessage = message.trim();

    const nextErrors: FormErrors = {};

    if (!trimmedName) {
      nextErrors.name = "Please enter your name.";
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail) {
      nextErrors.email = "Please enter your email.";
    } else if (!emailPattern.test(trimmedEmail)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!trimmedMessage) {
      nextErrors.message = "Please describe your problem.";
    } else if (trimmedMessage.length > 500) {
      nextErrors.message = "Message must be 500 characters or less.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.name) {
        nameRef.current?.focus();
      } else if (nextErrors.email) {
        emailRef.current?.focus();
      } else if (nextErrors.message) {
        messageRef.current?.focus();
      }
      return;
    }

    setName("");
    setEmail("");
    setMessage("");
    setShowSuccess(true);

    requestAnimationFrame(() => {
      successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <section className="help-support-page">
      <div className="help-support-header">
        <span className="help-support-eyebrow">SUPPORT CENTER</span>
        <h1>Help & Support</h1>
        <p>Find answers, learn how ClipCraft works, and get help when you need it.</p>
      </div>

      {/* SEARCH */}
      <div className="help-support-search">
        <input
          type="search"
          className="help-search-input"
          placeholder="Search for help..."
          aria-label="Search for help"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="help-support-content">
        {/* FAQ */}
        <div className="help-support-card help-faq-card">
          <h2>Frequently Asked Questions</h2>
          <p>Helpful answers for common ClipCraft questions.</p>

          <div className="help-faq-list">
            {visibleFaqs.map(({ faq, index }) => {
              const isOpen = openIndex === index;
              return (
                <div className={`help-faq-item${isOpen ? " open" : ""}`} key={faq.question}>
                  <button
                    className="help-faq-question"
                    type="button"
                    onClick={() => toggleFaq(index)}
                  >
                    {faq.question}
                    <span aria-hidden="true">{isOpen ? "\u2212" : "+"}</span>
                  </button>
                  <div className="help-faq-answer" style={{ display: isOpen ? "block" : "none" }}>
                    {faq.answer}
                  </div>
                </div>
              );
            })}

            {noResults && (
              <div className="help-no-results">No results found. Try a different search.</div>
            )}
          </div>
        </div>

        {/* GETTING STARTED */}
        <div className="help-support-card help-getting-started-card">
          <h2>Getting Started</h2>
          <p>Follow these simple steps to start working with ClipCraft.</p>

          <div className="help-started-steps">
            {STEPS.map((step) => (
              <div className="help-started-step" key={step.number}>
                <span className="help-step-number">{step.number}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONTACT SUPPORT */}
        <div className="help-support-card help-contact-card" id="contactSupportCard">
          <h2>Contact Support</h2>
          <p>Need more help? Send us your question or problem.</p>

          <button
            type="button"
            className="help-contact-button"
            id="openSupportForm"
            onClick={openSupportForm}
          >
            Contact Support
          </button>
        </div>
      </div>

      {/* SUPPORT FORM */}
      <div
        className="help-support-form-wrapper"
        id="supportFormWrapper"
        ref={formWrapperRef}
        hidden={!showForm}
      >
        <div className="help-support-form-card">
          <div className="help-support-form-header">
            <h2>Contact Support</h2>
            <p>Tell us what you need help with.</p>
          </div>

          <form id="supportForm" onSubmit={handleSubmit} noValidate>
            <div className="help-form-field">
              <label htmlFor="supportName">Name</label>
              <input
                type="text"
                id="supportName"
                name="name"
                placeholder="Enter your name"
                required
                ref={nameRef}
                value={name}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={errors.name ? "true" : undefined}
              />
              <p className="help-field-error" id="supportNameError" hidden={!errors.name}>
                {errors.name}
              </p>
            </div>

            <div className="help-form-field">
              <label htmlFor="supportEmail">Email</label>
              <input
                type="email"
                id="supportEmail"
                name="email"
                placeholder="Enter your email"
                required
                ref={emailRef}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={errors.email ? "true" : undefined}
              />
              <p className="help-field-error" id="supportEmailError" hidden={!errors.email}>
                {errors.email}
              </p>
            </div>

            <div className="help-form-field">
              <label htmlFor="supportMessage">How can we help?</label>
              <textarea
                id="supportMessage"
                name="message"
                rows={5}
                maxLength={500}
                placeholder="Describe your problem..."
                required
                ref={messageRef}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                aria-invalid={errors.message ? "true" : undefined}
              />
              <div className="help-message-counter">
                <span id="supportMessageCount">{message.length}</span>/500
              </div>
              <p className="help-field-error" id="supportMessageError" hidden={!errors.message}>
                {errors.message}
              </p>
            </div>

            <div className="help-support-form-actions">
              <button
                type="button"
                className="help-cancel-button"
                id="closeSupportForm"
                onClick={closeSupportForm}
              >
                Cancel
              </button>
              <button type="submit" className="help-submit-button">
                Send Request
              </button>
            </div>
          </form>

          {/* SUCCESS MESSAGE */}
          <div
            className="help-success-message"
            id="helpSuccessMessage"
            role="status"
            aria-live="polite"
            hidden={!showSuccess}
            ref={successRef}
          >
            <strong>Request submitted successfully.</strong>
            <p>Thank you for contacting ClipCraft Support. We will review your request.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
