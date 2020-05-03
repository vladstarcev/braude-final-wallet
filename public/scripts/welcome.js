$(".login-btn").on("click", function() {
  $(".login-form").slideToggle();
  $(".create-form").slideUp();
});

$(".create-btn").on("click", function() {
  $(".create-form").slideToggle();
  $(".login-form").slideUp();
});
