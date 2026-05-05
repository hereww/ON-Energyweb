import type { CollectionConfig } from 'payload'

export const Articles: CollectionConfig = {
  slug: 'articles',
  access: {
    read: () => true,
  },
  admin: {
    defaultColumns: ['title', 'category', 'publishedAt', 'updatedAt'],
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
      name: 'excerpt',
      type: 'textarea',
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
      name: 'category',
      type: 'select',
      defaultValue: 'market',
      options: [
        {
          label: 'Market',
          value: 'market',
        },
        {
          label: 'Technology',
          value: 'technology',
        },
        {
          label: 'Company',
          value: 'company',
        },
      ],
      required: true,
    },
    {
      name: 'cover',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        date: {
          pickerAppearance: 'dayAndTime',
        },
      },
      defaultValue: () => new Date().toISOString(),
      required: true,
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
