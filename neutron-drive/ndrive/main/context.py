from django.conf import settings

def site_context (context):
  c = {
    'NDEBUG': settings.DEBUG,
    'CLIENT_ID': settings.GOOGLE_API_CLIENT_ID.split('.')[0]
  }
  
  return c