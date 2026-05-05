import type { CollectionConfig } from 'payload'

export const Pages: CollectionConfig = {
  slug: 'pages',
  access: {
    read: () => true,
  },
  admin: {
    defaultColumns: ['title', 'slug', 'updatedAt'],
    group: 'Content',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      localized: true,
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      index: true,
      required: true,
      unique: true,
    },
    {
      name: 'hero',
      type: 'group',
      fields: [
        {
          name: 'headline',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'subline',
          type: 'textarea',
          localized: true,
          required: true,
        },
        {
          name: 'primaryCtaLabel',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'secondaryCtaLabel',
          type: 'text',
          localized: true,
        },
      ],
    },
    {
      name: 'statement',
      type: 'group',
      fields: [
        {
          name: 'headline',
          type: 'textarea',
          localized: true,
          required: true,
        },
        {
          name: 'lead',
          type: 'textarea',
          localized: true,
          required: true,
        },
      ],
    },
    {
      name: 'storyItems',
      type: 'array',
      fields: [
        {
          name: 'kind',
          type: 'select',
          defaultValue: 'challenge',
          options: [
            {
              label: 'Challenge',
              value: 'challenge',
            },
            {
              label: 'Solution',
              value: 'solution',
            },
          ],
          required: true,
        },
        {
          name: 'number',
          type: 'number',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'body',
          type: 'textarea',
          localized: true,
          required: true,
        },
        {
          name: 'metricLabel',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'metricValue',
          type: 'text',
          required: true,
        },
        {
          name: 'metricUnit',
          type: 'text',
          localized: true,
        },
      ],
    },
    {
      name: 'proofPoints',
      type: 'array',
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          localized: true,
          required: true,
        },
      ],
    },
    {
      name: 'deploymentHighlights',
      type: 'array',
      fields: [
        {
          name: 'value',
          type: 'text',
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          localized: true,
          required: true,
        },
      ],
    },
    {
      name: 'gridSceneSteps',
      type: 'array',
      fields: [
        {
          name: 'kind',
          type: 'select',
          defaultValue: 'challenge',
          options: [
            {
              label: 'Challenge',
              value: 'challenge',
            },
            {
              label: 'Solution',
              value: 'solution',
            },
          ],
          required: true,
        },
        {
          name: 'number',
          type: 'number',
          required: true,
        },
        {
          name: 'title',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'body',
          type: 'textarea',
          localized: true,
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'capacity',
          type: 'text',
          required: true,
        },
        {
          name: 'progress',
          type: 'number',
          required: true,
        },
      ],
    },
    {
      name: 'cta',
      type: 'group',
      fields: [
        {
          name: 'headline',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'body',
          type: 'textarea',
          localized: true,
          required: true,
        },
        {
          name: 'label',
          type: 'text',
          localized: true,
          required: true,
        },
        {
          name: 'href',
          type: 'text',
          defaultValue: 'mailto:hello@eastasiapower.example',
          required: true,
        },
      ],
    },
    {
      name: 'seo',
      type: 'group',
      fields: [
        {
          name: 'title',
          type: 'text',
          localized: true,
        },
        {
          name: 'description',
          type: 'textarea',
          localized: true,
        },
      ],
    },
  ],
  versions: {
    drafts: true,
  },
}
