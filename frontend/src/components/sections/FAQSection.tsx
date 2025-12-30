import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  config: {
    title?: string
    subtitle?: string
    items?: FAQItem[]
  }
  colors?: {
    primary?: string
    accent?: string
  }
}

export default function FAQSection({ config, colors }: FAQSectionProps) {
  const {
    title = 'Frequently Asked Questions',
    subtitle = 'Find answers to common questions',
    items = [
      {
        question: 'What are your check-in and check-out times?',
        answer: 'Check-in is from 2:00 PM and check-out is at 11:00 AM. Early check-in or late check-out may be available upon request.',
      },
      {
        question: 'Do you offer airport transfers?',
        answer: 'Yes, we offer airport pickup and drop-off services. Please contact us in advance to arrange this service.',
      },
      {
        question: 'Is breakfast included in the room rate?',
        answer: 'Breakfast availability varies by room type. Please check the specific room details or contact us for more information.',
      },
      {
        question: 'What is your cancellation policy?',
        answer: 'Free cancellation is available up to 48 hours before check-in. Cancellations within 48 hours may incur a charge.',
      },
    ],
  } = config

  const [openIndex, setOpenIndex] = useState<number | null>(0)
  const primaryColor = colors?.primary || '#1f2937'

  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {title}
          </h2>
          {subtitle && (
            <p className="text-lg text-gray-600">
              {subtitle}
            </p>
          )}
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {items.map((item, index) => {
            const isOpen = openIndex === index
            return (
              <div
                key={index}
                className="bg-white rounded-xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900 pr-4">
                    {item.question}
                  </span>
                  <ChevronDown
                    size={20}
                    className={`flex-shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    style={{ color: primaryColor }}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    isOpen ? 'max-h-96' : 'max-h-0'
                  }`}
                >
                  <p className="px-6 pb-5 text-gray-600 leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
