$(".login-btn").on("click", function() {
  $(".login-form").slideToggle("slow");
  $(".create-form").slideUp("slow");
});

$(".create-btn").on("click", function() {
  $(".create-form").slideToggle("slow");
  $(".login-form").slideUp("slow");
});
