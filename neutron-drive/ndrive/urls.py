from django.views.generic import RedirectView
from django.conf.urls import patterns, include, url

urlpatterns = patterns('',
  (r'^favicon.ico', RedirectView.as_view(url='/static/favicon.ico')),
  url(r'^$', 'ndrive.main.views.home', name='home'),
  # url(r'^ndrive/', include('ndrive.foo.urls')),
)
