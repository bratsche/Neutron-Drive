from django.conf import settings

def site_context (context):
  c = {
    'NDEBUG': settings.DEBUG,
  }
  
  return c