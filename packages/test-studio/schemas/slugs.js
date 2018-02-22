import React from 'react'

export default {
  name: 'slugsTest',
  type: 'document',
  title: 'Slugs test',
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug.current'
    },
    prepare: ({title, subtitle}) => {
      return {
        title: title,
        subtitle: <span style={{fontFamily: 'monospace'}}>{`/${subtitle}/`}</span>
      }
    }
  },
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Title'
    },
    {
      name: 'slug',
      type: 'slug',
      title: 'Normal slug',
      description: 'This is a slug field that should update according to current title',
      options: {
        source: 'title',
        maxLength: 96
      }
    },
    {
      name: 'slugWithFunction',
      type: 'slug',
      title: 'Slug with function to get source',
      description: 'This is a slug field that should update according to current title',
      options: {
        source: document => document.title,
        maxLength: 96
      }
    },
    {
      name: 'slugWithCustomUniqueCheck',
      type: 'slug',
      title: 'Slug with custom unique check',
      description: 'Slugs starting with "hei" are always taken, regardless of documents using it',
      options: {
        source: 'title',
        maxLength: 100,
        checkUnique: value => /^hei/i.test(value)
      }
    },
    {
      name: 'nested',
      type: 'object',
      fields: [
        {
          name: 'slugWithSlugify',
          type: 'slug',
          title: 'Custom slugify function',
          description: 'This is a slug field that should update according to current title',
          options: {
            source: 'title',
            maxLength: 96,
            slugify: (value, type) => {
              return encodeURI(`${type.name}_${value}`).toLocaleLowerCase()
            }
          }
        }
      ]
    }
  ]
}
